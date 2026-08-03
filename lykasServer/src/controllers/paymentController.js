const Payment = require("../models/Payment");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { createCheckoutSession } = require("../config/paymongo");
const { verifyPaymongoSignature } = require("../utils/paymongoWebhook");
const { notify } = require("../utils/notificationHelper");
const { logAudit } = require("../utils/auditLogger");
const { logger } = require("../utils/logger");

/**
 * POST /webhook — PayMongo → server. Mounted behind express.raw() in
 * server.js so req.body here is the exact raw Buffer PayMongo signed;
 * verifying against anything else (e.g. a JSON-parsed/re-stringified body)
 * will not match the signature.
 */
const webhook = asyncHandler(async (req, res) => {
  const signatureHeader = req.headers["paymongo-signature"];
  const rawBody = req.body; // Buffer, thanks to express.raw() on this route

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    logger.warn("PayMongo webhook received with no raw body — cannot verify signature");
    return res.status(400).json({ success: false, message: "Empty request body" });
  }

  const isValid = verifyPaymongoSignature(rawBody.toString("utf8"), signatureHeader, process.env.PAYMONGO_WEBHOOK_SECRET, {
    live: process.env.NODE_ENV === "production",
  });

  if (!isValid) {
    logger.warn("Rejected PayMongo webhook — signature verification failed");
    return res.status(401).json({ success: false, message: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Invalid JSON payload" });
  }

  const eventType = event?.data?.attributes?.type;
  const resource = event?.data?.attributes?.data;
  const paymongoPaymentId = resource?.attributes?.checkout_session_id || resource?.id;

  logger.info({ eventType, paymongoPaymentId }, "PayMongo webhook received");

  // Always 200 once signature-verified, even if we can't match a record —
  // PayMongo retries on non-2xx, and a stray/duplicate event shouldn't
  // cause retry storms (§ troubleshooting guidance).
  const payment = await Payment.findOne({ paymongoPaymentId });
  if (!payment) {
    logger.warn({ paymongoPaymentId }, "PayMongo webhook for unknown payment — acknowledging anyway");
    return res.status(200).json({ success: true });
  }

  if (eventType === "checkout_session.payment.paid" || eventType === "payment.paid") {
    payment.status = "paid";
    payment.paidAt = new Date();
    payment.paymongoStatus = "paid";
    payment.paymentMethod = resource?.attributes?.source?.type || resource?.attributes?.payment_method_used || null;
    await payment.save();

    await notify({
      recipient: payment.paidBy,
      type: "PAYMENT_RECEIVED",
      title: "Payment received",
      message: `We received your payment of ₱${(payment.amount / 100).toFixed(2)}. Thank you!`,
      refModel: payment.refModel,
      refId: payment.refId,
    });
  } else if (eventType === "payment.failed") {
    payment.status = "failed";
    payment.paymongoStatus = "failed";
    await payment.save();

    await notify({
      recipient: payment.paidBy,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      message: "Your payment could not be processed. Please try again.",
      refModel: payment.refModel,
      refId: payment.refId,
    });
  } else {
    logger.info({ eventType }, "Unhandled PayMongo event type — acknowledged, no state change");
  }

  res.status(200).json({ success: true });
});

const createCheckout = asyncHandler(async (req, res) => {
  const { type, amount, description, refModel, refId } = req.body;

  const baseUrl = process.env.MOBILE_APP_URL || "carepaws://";
  const { paymongoPaymentId, checkoutUrl } = await createCheckoutSession({
    amount,
    description: description || `CarePaws ${type.replace("_", " ")}`,
    successUrl: `${baseUrl}payment/success`,
    cancelUrl: `${baseUrl}payment/cancel`,
    metadata: { userId: req.user._id.toString(), type },
  });

  const payment = await Payment.create({
    paidBy: req.user._id,
    type,
    amount,
    description,
    refModel: refModel || null,
    refId: refId || null,
    paymongoPaymentId,
    paymongoCheckoutUrl: checkoutUrl,
    status: "pending",
  });

  res.status(201).json({ success: true, data: { payment, checkoutUrl } });
});

const myPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { paidBy: req.user._id };

  const [data, total] = await Promise.all([
    Payment.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getMyPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, paidBy: req.user._id });
  if (!payment) throw new AppError("Payment not found", 404);
  res.status(200).json({ success: true, data: payment });
});

const summary = asyncHandler(async (req, res) => {
  const [byStatus, byType, totals] = await Promise.all([
    Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }]),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: "$type", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalCollectedCentavos: totals[0]?.total || 0,
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count, totalCentavos: s.total })),
      byType: byType.map((t) => ({ type: t._id, count: t.count, totalCentavos: t.total })),
    },
  });
});

const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [data, total] = await Promise.all([
    Payment.find(filter).sort("-createdAt").skip(skip).limit(limit).populate("paidBy", "displayName email"),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate("paidBy", "displayName email");
  if (!payment) throw new AppError("Payment not found", 404);
  res.status(200).json({ success: true, data: payment });
});

const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new AppError("Payment not found", 404);
  if (payment.status !== "paid") throw new AppError("Only a paid payment can be refunded", 400);

  // NOTE: this records the refund on our side; actually calling PayMongo's
  // refund API (POST /v1/refunds) is a follow-up — it needs a documented
  // decision on partial-vs-full refunds this pass didn't need to make yet.
  payment.status = "refunded";
  payment.notes = req.body.reason ? `${payment.notes || ""}\nRefund reason: ${req.body.reason}`.trim() : payment.notes;
  await payment.save();

  await logAudit({
    actor: req.user._id,
    action: "payment.refund",
    entityType: null,
    entityId: payment._id,
    metadata: { reason: req.body.reason },
    req,
  });

  res.status(200).json({ success: true, data: payment });
});

module.exports = {
  webhook,
  createCheckout,
  myPayments,
  getMyPayment,
  summary,
  listPayments,
  getPayment,
  refundPayment,
};
