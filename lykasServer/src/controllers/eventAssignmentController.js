const { EventVolunteerAssignment } = require("../models/Event");
const Volunteer = require("../models/Volunteer");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

const myAssignments = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findOne({ user: req.user._id });
  if (!volunteer) return res.status(200).json({ success: true, data: [] });

  const assignments = await EventVolunteerAssignment.find({ volunteer: volunteer._id })
    .sort("-createdAt")
    .populate("event", "title date location");

  res.status(200).json({ success: true, data: assignments });
});

const createAssignment = asyncHandler(async (req, res) => {
  const assignment = await EventVolunteerAssignment.create({ ...req.body, assignedBy: req.user._id });
  res.status(201).json({ success: true, data: assignment });
});

const listAssignments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.event) filter.event = req.query.event;
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    EventVolunteerAssignment.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("event", "title date")
      .populate({ path: "volunteer", populate: { path: "user", select: "displayName email" } }),
    EventVolunteerAssignment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await EventVolunteerAssignment.findById(req.params.id);
  if (!assignment) throw new AppError("Assignment not found", 404);

  Object.assign(assignment, req.body);
  await assignment.save();

  res.status(200).json({ success: true, data: assignment });
});

const confirmAssignment = asyncHandler(async (req, res) => {
  const assignment = await EventVolunteerAssignment.findById(req.params.id);
  if (!assignment) throw new AppError("Assignment not found", 404);

  const volunteer = await Volunteer.findOne({ user: req.user._id });
  const isOwner = volunteer && assignment.volunteer.toString() === volunteer._id.toString();
  const isStaff = ["staff", "admin", "super_admin"].includes(req.user.role);
  if (!isOwner && !isStaff) throw new AppError("You do not have permission to confirm this assignment", 403);

  assignment.status = "confirmed";
  await assignment.save();

  res.status(200).json({ success: true, data: assignment });
});

const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await EventVolunteerAssignment.findById(req.params.id);
  if (!assignment) throw new AppError("Assignment not found", 404);

  await assignment.deleteOne();
  res.status(200).json({ success: true, message: "Assignment deleted" });
});

module.exports = {
  myAssignments,
  createAssignment,
  listAssignments,
  updateAssignment,
  confirmAssignment,
  deleteAssignment,
};
