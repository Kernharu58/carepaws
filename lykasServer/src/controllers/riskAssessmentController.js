const RiskAssessment = require("../models/RiskAssessment");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

const byApplication = asyncHandler(async (req, res) => {
  const assessments = await RiskAssessment.find({ application: req.params.applicationId })
    .sort("-createdAt")
    .populate("assessedBy", "displayName");
  res.status(200).json({ success: true, data: assessments });
});

const createRiskAssessment = asyncHandler(async (req, res) => {
  // totalScore/riskLevel are never accepted from the client — the schema
  // doesn't even have a slot for them, and the model's pre-save hook
  // computes both from `scores` regardless of what's passed.
  const assessment = await RiskAssessment.create({ ...req.body, assessedBy: req.user._id });
  res.status(201).json({ success: true, data: assessment });
});

const listRiskAssessments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;
  if (req.query.recommendation) filter.recommendation = req.query.recommendation;

  const [data, total] = await Promise.all([
    RiskAssessment.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species")
      .populate("applicant", "displayName email")
      .populate("assessedBy", "displayName"),
    RiskAssessment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getRiskAssessment = asyncHandler(async (req, res) => {
  const assessment = await RiskAssessment.findById(req.params.id)
    .populate("pet", "name species")
    .populate("applicant", "displayName email")
    .populate("assessedBy", "displayName");
  if (!assessment) throw new AppError("Risk assessment not found", 404);
  res.status(200).json({ success: true, data: assessment });
});

const updateRiskAssessment = asyncHandler(async (req, res) => {
  const assessment = await RiskAssessment.findById(req.params.id);
  if (!assessment) throw new AppError("Risk assessment not found", 404);

  if (req.body.scores) Object.assign(assessment.scores, req.body.scores);
  if (req.body.notes !== undefined) assessment.notes = req.body.notes;
  if (req.body.redFlags !== undefined) assessment.redFlags = req.body.redFlags;
  if (req.body.recommendation !== undefined) assessment.recommendation = req.body.recommendation;

  // save() re-runs the pre-save hook, so totalScore/riskLevel are
  // recomputed here too if scores changed.
  await assessment.save();

  res.status(200).json({ success: true, data: assessment });
});

module.exports = {
  byApplication,
  createRiskAssessment,
  listRiskAssessments,
  getRiskAssessment,
  updateRiskAssessment,
};
