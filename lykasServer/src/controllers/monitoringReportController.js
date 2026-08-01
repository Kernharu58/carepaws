const MonitoringReport = require("../models/MonitoringReport");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

const myReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { submittedBy: req.user._id };

  const [data, total] = await Promise.all([
    MonitoringReport.find(filter).sort("-reportDate").skip(skip).limit(limit).populate("pet", "name species"),
    MonitoringReport.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const flaggedReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { status: "flagged" };

  const [data, total] = await Promise.all([
    MonitoringReport.find(filter)
      .sort("-reportDate")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species")
      .populate("submittedBy", "displayName email"),
    MonitoringReport.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const reportsForPet = asyncHandler(async (req, res) => {
  const reports = await MonitoringReport.find({ pet: req.params.petId })
    .sort("-reportDate")
    .populate("submittedBy", "displayName");
  res.status(200).json({ success: true, data: reports });
});

const createReport = asyncHandler(async (req, res) => {
  const report = await MonitoringReport.create({ ...req.body, submittedBy: req.user._id });
  res.status(201).json({ success: true, data: report });
});

const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    MonitoringReport.find(filter)
      .sort("-reportDate")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species")
      .populate("submittedBy", "displayName email"),
    MonitoringReport.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getReport = asyncHandler(async (req, res) => {
  const report = await MonitoringReport.findById(req.params.id)
    .populate("pet", "name species")
    .populate("submittedBy", "displayName email");
  if (!report) throw new AppError("Monitoring report not found", 404);
  res.status(200).json({ success: true, data: report });
});

const reviewReport = asyncHandler(async (req, res) => {
  const report = await MonitoringReport.findById(req.params.id);
  if (!report) throw new AppError("Monitoring report not found", 404);

  report.status = req.body.status;
  report.adminNotes = req.body.adminNotes;
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  await report.save();

  res.status(200).json({ success: true, data: report });
});

module.exports = { myReports, flaggedReports, reportsForPet, createReport, listReports, getReport, reviewReport };
