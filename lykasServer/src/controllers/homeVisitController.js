const HomeVisit = require("../models/HomeVisit");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

const myHomeVisits = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { applicant: req.user._id };

  const [data, total] = await Promise.all([
    HomeVisit.find(filter).sort("-scheduledDate").skip(skip).limit(limit).populate("pet", "name species"),
    HomeVisit.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createHomeVisit = asyncHandler(async (req, res) => {
  const homeVisit = await HomeVisit.create({
    ...req.body,
    assignedTo: req.body.assignedTo || req.user._id,
  });
  res.status(201).json({ success: true, data: homeVisit });
});

const listHomeVisits = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.application) filter.application = req.query.application;

  const [data, total] = await Promise.all([
    HomeVisit.find(filter)
      .sort("-scheduledDate")
      .skip(skip)
      .limit(limit)
      .populate("pet", "name species")
      .populate("applicant", "displayName email")
      .populate("assignedTo", "displayName"),
    HomeVisit.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getHomeVisit = asyncHandler(async (req, res) => {
  const homeVisit = await HomeVisit.findById(req.params.id)
    .populate("pet", "name species")
    .populate("applicant", "displayName email")
    .populate("assignedTo", "displayName");
  if (!homeVisit) throw new AppError("Home visit not found", 404);
  res.status(200).json({ success: true, data: homeVisit });
});

const updateHomeVisit = asyncHandler(async (req, res) => {
  const homeVisit = await HomeVisit.findById(req.params.id);
  if (!homeVisit) throw new AppError("Home visit not found", 404);

  Object.assign(homeVisit, req.body);
  await homeVisit.save();

  res.status(200).json({ success: true, data: homeVisit });
});

const completeHomeVisit = asyncHandler(async (req, res) => {
  const homeVisit = await HomeVisit.findById(req.params.id);
  if (!homeVisit) throw new AppError("Home visit not found", 404);

  homeVisit.status = "completed";
  homeVisit.result = req.body.result;
  homeVisit.notes = req.body.notes;
  if (req.body.report) homeVisit.report = { ...homeVisit.report?.toObject?.(), ...req.body.report };
  homeVisit.completedAt = new Date();
  await homeVisit.save();

  res.status(200).json({ success: true, data: homeVisit });
});

const cancelHomeVisit = asyncHandler(async (req, res) => {
  const homeVisit = await HomeVisit.findById(req.params.id);
  if (!homeVisit) throw new AppError("Home visit not found", 404);

  homeVisit.status = "cancelled";
  homeVisit.cancelReason = req.body.cancelReason;
  await homeVisit.save();

  res.status(200).json({ success: true, data: homeVisit });
});

const noShowHomeVisit = asyncHandler(async (req, res) => {
  const homeVisit = await HomeVisit.findById(req.params.id);
  if (!homeVisit) throw new AppError("Home visit not found", 404);

  homeVisit.status = "no-show";
  await homeVisit.save();

  res.status(200).json({ success: true, data: homeVisit });
});

module.exports = {
  myHomeVisits,
  createHomeVisit,
  listHomeVisits,
  getHomeVisit,
  updateHomeVisit,
  completeHomeVisit,
  cancelHomeVisit,
  noShowHomeVisit,
};
