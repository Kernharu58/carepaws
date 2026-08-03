const InKindDonation = require("../models/InKindDonation");
const AuditLog = require("../models/AuditLog");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { softDelete, restore } = require("../utils/softDeleteMixin");
const { logAudit } = require("../utils/auditLogger");
const { sendCsv } = require("../utils/exportUtil");

const searchFields = ["name", "notes"];
const filterFields = ["status", "dropOff"];

const createDonation = asyncHandler(async (req, res) => {
  const donation = await InKindDonation.create({ ...req.body, donatedBy: req.user._id });
  res.status(201).json({ success: true, data: donation });
});

const myDonations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { donatedBy: req.user._id, isDeleted: false };

  const [data, total] = await Promise.all([
    InKindDonation.find(filter).sort("-createdAt").skip(skip).limit(limit),
    InKindDonation.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const listDonations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });
  if (String(req.query.includeDeleted).toLowerCase() !== "true") filter.isDeleted = false;

  const [data, total] = await Promise.all([
    InKindDonation.find(filter).sort(sort).skip(skip).limit(limit).populate("donatedBy", "displayName email"),
    InKindDonation.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const exportDonations = asyncHandler(async (req, res) => {
  const { filter } = buildListQuery(req.query, { searchFields, filterFields });
  filter.isDeleted = false;

  const donations = await InKindDonation.find(filter).populate("donatedBy", "displayName email").lean();

  sendCsv(
    res,
    "in-kind-donations.csv",
    donations.map((d) => ({ ...d, donorName: d.donatedBy?.displayName, donorEmail: d.donatedBy?.email })),
    [
      { key: "name", label: "Item" },
      { key: "quantity", label: "Quantity" },
      { key: "donorName", label: "Donor" },
      { key: "donorEmail", label: "Email" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Submitted" },
    ]
  );
});

const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  const result = await InKindDonation.updateMany({ _id: { $in: ids } }, { status });

  await logAudit({
    actor: req.user._id,
    action: "inkind_donation.bulk_status",
    metadata: { ids, status, matched: result.matchedCount },
    req,
  });

  res.status(200).json({ success: true, message: `Updated ${result.modifiedCount} donation(s)` });
});

const updateStatus = asyncHandler(async (req, res) => {
  const donation = await InKindDonation.findById(req.params.id);
  if (!donation) throw new AppError("Donation not found", 404);

  const previousValues = { status: donation.status };
  donation.status = req.body.status;
  if (req.body.staffNote !== undefined) donation.staffNote = req.body.staffNote;
  if (donation.status === "received" && !donation.receivedAt) donation.receivedAt = new Date();
  await donation.save();

  await logAudit({
    actor: req.user._id,
    action: "inkind_donation.status.update",
    entityType: "InKindDonation",
    entityId: donation._id,
    previousValues,
    newValues: { status: donation.status },
    req,
  });

  res.status(200).json({ success: true, data: donation });
});

const deleteDonation = asyncHandler(async (req, res) => {
  const donation = await softDelete(InKindDonation, req.params.id, req.user._id);
  if (!donation) throw new AppError("Donation not found", 404);
  res.status(200).json({ success: true, message: "Donation removed" });
});

const restoreDonation = asyncHandler(async (req, res) => {
  const donation = await restore(InKindDonation, req.params.id);
  if (!donation) throw new AppError("Donation not found", 404);
  res.status(200).json({ success: true, data: donation });
});

const donationHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { entityType: "InKindDonation", entityId: req.params.id };

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort("-createdAt").skip(skip).limit(limit).populate("actor", "displayName"),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

module.exports = {
  createDonation,
  myDonations,
  listDonations,
  exportDonations,
  bulkUpdateStatus,
  updateStatus,
  deleteDonation,
  restoreDonation,
  donationHistory,
};
