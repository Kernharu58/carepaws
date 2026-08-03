const Interview = require("../models/Interview");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { notify } = require("../utils/notificationHelper");

const myInterviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { applicant: req.user._id };

  const [data, total] = await Promise.all([
    Interview.find(filter).sort("-scheduledDate").skip(skip).limit(limit).populate("pet", "name species"),
    Interview.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.create({
    ...req.body,
    conductedBy: req.body.conductedBy || req.user._id,
  });

  await notify({
    recipient: interview.applicant,
    sender: req.user._id,
    type: "INTERVIEW_SCHEDULED",
    title: "Interview scheduled",
    message: `Your adoption interview is scheduled for ${new Date(interview.scheduledDate).toLocaleString()}.`,
    refModel: "Interview",
    refId: interview._id,
  });

  res.status(201).json({ success: true, data: interview });
});

const listInterviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.application) filter.application = req.query.application;

  const [data, total] = await Promise.all([
    Interview.find(filter)
      .sort("-scheduledDate")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species")
      .populate("applicant", "displayName email")
      .populate("conductedBy", "displayName"),
    Interview.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate("pet", "name species")
    .populate("applicant", "displayName email")
    .populate("conductedBy", "displayName");
  if (!interview) throw new AppError("Interview not found", 404);
  res.status(200).json({ success: true, data: interview });
});

const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError("Interview not found", 404);

  Object.assign(interview, req.body);
  await interview.save();

  res.status(200).json({ success: true, data: interview });
});

const completeInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError("Interview not found", 404);

  interview.status = "completed";
  interview.result = req.body.result;
  interview.notes = req.body.notes;
  interview.completedAt = new Date();
  await interview.save();

  await notify({
    recipient: interview.applicant,
    sender: req.user._id,
    type: "INTERVIEW_RESULT",
    title: "Interview result available",
    message: `Your interview has been marked as ${interview.result}.`,
    refModel: "Interview",
    refId: interview._id,
  });

  res.status(200).json({ success: true, data: interview });
});

const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError("Interview not found", 404);

  interview.status = "cancelled";
  interview.cancelReason = req.body.cancelReason;
  await interview.save();

  await notify({
    recipient: interview.applicant,
    sender: req.user._id,
    type: "INTERVIEW_CANCELLED",
    title: "Interview cancelled",
    message: interview.cancelReason || "Your scheduled interview has been cancelled.",
    refModel: "Interview",
    refId: interview._id,
  });

  res.status(200).json({ success: true, data: interview });
});

const noShowInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new AppError("Interview not found", 404);

  interview.status = "no-show";
  await interview.save();

  res.status(200).json({ success: true, data: interview });
});

module.exports = {
  myInterviews,
  createInterview,
  listInterviews,
  getInterview,
  updateInterview,
  completeInterview,
  cancelInterview,
  noShowInterview,
};
