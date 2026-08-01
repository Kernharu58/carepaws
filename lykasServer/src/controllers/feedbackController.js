const Feedback = require("../models/Feedback");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");

const publicFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { isPublic: true, status: { $in: ["responded", "resolved"] } };

  const [data, total] = await Promise.all([
    Feedback.find(filter)
      .sort(req.query.featured === "true" ? "-isFeatured -createdAt" : "-createdAt")
      .skip(skip)
      .limit(limit)
      .select("-submittedBy")
      .populate("relatedPet", "name species imageUrl"),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const myFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { submittedBy: req.user._id };

  const [data, total] = await Promise.all([
    Feedback.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.create({ ...req.body, submittedBy: req.user._id });
  res.status(201).json({ success: true, data: feedback });
});

const listFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { filterFields: ["type", "status"] });

  const [data, total] = await Promise.all([
    Feedback.find(filter).sort(sort).skip(skip).limit(limit).populate("submittedBy", "displayName email"),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id).populate("submittedBy", "displayName email");
  if (!feedback) throw new AppError("Feedback not found", 404);
  res.status(200).json({ success: true, data: feedback });
});

const updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw new AppError("Feedback not found", 404);

  Object.assign(feedback, req.body);
  if (req.body.adminResponse && !feedback.respondedAt) {
    feedback.respondedBy = req.user._id;
    feedback.respondedAt = new Date();
    if (!req.body.status) feedback.status = "responded";
  }
  await feedback.save();

  res.status(200).json({ success: true, data: feedback });
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw new AppError("Feedback not found", 404);

  await feedback.deleteOne();
  res.status(200).json({ success: true, message: "Feedback deleted" });
});

module.exports = { publicFeedback, myFeedback, createFeedback, listFeedback, getFeedback, updateFeedback, deleteFeedback };
