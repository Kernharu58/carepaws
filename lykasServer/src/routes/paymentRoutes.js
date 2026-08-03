const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/paymentController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createCheckoutSchema, refundSchema } = require("../validators/payment.schema");

// NOTE: the webhook route itself is NOT protected by JWT auth (the gateway
// calls it directly) — its trust boundary is the PayMongo signature check
// inside the controller, not req.user. It is also mounted behind
// express.raw() in server.js, before this router sees the request, so
// req.body here is the raw Buffer, not JSON-parsed.
router.post("/webhook", ctrl.webhook);

router.post("/create-checkout", protect, validateRequest(createCheckoutSchema), ctrl.createCheckout);
router.get("/my", protect, ctrl.myPayments);
router.get("/my/:id", protect, ctrl.getMyPayment);
router.get("/summary", protect, adminOnly, ctrl.summary);
router.get("/", protect, adminOnly, ctrl.listPayments);
router.get("/:id", protect, adminOnly, ctrl.getPayment);
router.put("/:id/refund", protect, adminOnly, validateRequest(refundSchema), ctrl.refundPayment);

module.exports = router;
