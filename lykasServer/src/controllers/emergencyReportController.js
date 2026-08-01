const EmergencyReport = require("../models/EmergencyReport");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logAudit } = require("../utils/auditLogger");

const filterFields = ["status", "priority", "type"];
const searchFields = ["description", "location", "animalType"];

const myReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { submittedBy: req.user._id };

  const [data, total] = await Promise.all([
    EmergencyReport.find(filter).sort("-createdAt").skip(skip).limit(limit),
    EmergencyReport.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createReport = asyncHandler(async (req, res) => {
  const report = await EmergencyReport.create({ ...req.body, submittedBy: req.user._id });
  res.status(201).json({ success: true, data: report });
});

const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });

  const [data, total] = await Promise.all([
    EmergencyReport.find(filter).sort(sort).skip(skip).limit(limit).populate("submittedBy", "displayName email"),
    EmergencyReport.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getReport = asyncHandler(async (req, res) => {
  const report = await EmergencyReport.findById(req.params.id).populate("submittedBy", "displayName email");
  if (!report) throw new AppError("Emergency report not found", 404);
  res.status(200).json({ success: true, data: report });
});

const updateReport = asyncHandler(async (req, res) => {
  const report = await EmergencyReport.findById(req.params.id);
  if (!report) throw new AppError("Emergency report not found", 404);

  const previousValues = { status: report.status, priority: report.priority };
  Object.assign(report, req.body);

  if (req.body.status === "resolved" && !report.resolvedAt) {
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
  }
  await report.save();

  await logAudit({
    actor: req.user._id,
    action: "emergency_report.update",
    metadata: { reportId: report._id },
    previousValues,
    newValues: { status: report.status, priority: report.priority },
    req,
  });

  res.status(200).json({ success: true, data: report });
});

module.exports = { myReports, createReport, listReports, getReport, updateReport };
