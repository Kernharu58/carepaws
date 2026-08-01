const { Event, EventRegistration, EventVolunteerAssignment } = require("../models/Event");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");

const searchFields = ["title", "description", "location"];
const filterFields = ["category", "status", "isOnline"];

// --- Events ---

const listEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });
  // Events default to soonest-first rather than the generic newest-first.
  const effectiveSort = req.query.sortBy ? sort : { date: 1 };

  const [data, total] = await Promise.all([
    Event.find(filter).sort(effectiveSort).skip(skip).limit(limit),
    Event.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);
  res.status(200).json({ success: true, data: event });
});

const createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  Object.assign(event, req.body);
  await event.save();

  res.status(200).json({ success: true, data: event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  await event.deleteOne();
  await EventRegistration.deleteMany({ event: event._id });
  await EventVolunteerAssignment.deleteMany({ event: event._id });

  res.status(200).json({ success: true, message: "Event deleted" });
});

// --- Registrations ---

const myRegistrations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { user: req.user._id };

  const [data, total] = await Promise.all([
    EventRegistration.find(filter).sort("-registeredAt").skip(skip).limit(limit).populate("event"),
    EventRegistration.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  const existing = await EventRegistration.findOne({ event: event._id, user: req.user._id });
  if (existing) throw new AppError("You are already registered for this event", 400);

  if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
    throw new AppError("This event is full", 400);
  }

  const registration = await EventRegistration.create({ event: event._id, user: req.user._id });
  event.currentAttendees += 1;
  await event.save();

  res.status(201).json({ success: true, data: registration });
});

const unregisterFromEvent = asyncHandler(async (req, res) => {
  const registration = await EventRegistration.findOne({ event: req.params.id, user: req.user._id });
  if (!registration) throw new AppError("You are not registered for this event", 404);

  await registration.deleteOne();

  await Event.updateOne({ _id: req.params.id, currentAttendees: { $gt: 0 } }, { $inc: { currentAttendees: -1 } });

  res.status(200).json({ success: true, message: "Registration cancelled" });
});

const listRegistrations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { event: req.params.id };

  const [data, total] = await Promise.all([
    EventRegistration.find(filter)
      .sort("-registeredAt")
      .skip(skip)
      .limit(limit)
      .populate("user", "displayName email"),
    EventRegistration.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const markAttendance = asyncHandler(async (req, res) => {
  const registration = await EventRegistration.findOne({ event: req.params.id, user: req.params.userId });
  if (!registration) throw new AppError("Registration not found", 404);

  registration.status = req.body.status;
  await registration.save();

  res.status(200).json({ success: true, data: registration });
});

// --- Volunteer assignments (nested under an event) ---

const assignVolunteer = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404);

  const assignment = await EventVolunteerAssignment.create({
    event: event._id,
    volunteer: req.body.volunteer,
    role: req.body.role,
    assignedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: assignment });
});

const listEventVolunteers = asyncHandler(async (req, res) => {
  const assignments = await EventVolunteerAssignment.find({ event: req.params.id }).populate({
    path: "volunteer",
    populate: { path: "user", select: "displayName email" },
  });
  res.status(200).json({ success: true, data: assignments });
});

const updateEventVolunteerAssignment = asyncHandler(async (req, res) => {
  const assignment = await EventVolunteerAssignment.findOne({
    _id: req.params.assignmentId,
    event: req.params.id,
  });
  if (!assignment) throw new AppError("Assignment not found", 404);

  Object.assign(assignment, req.body);
  await assignment.save();

  res.status(200).json({ success: true, data: assignment });
});

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  myRegistrations,
  registerForEvent,
  unregisterFromEvent,
  listRegistrations,
  markAttendance,
  assignVolunteer,
  listEventVolunteers,
  updateEventVolunteerAssignment,
};
