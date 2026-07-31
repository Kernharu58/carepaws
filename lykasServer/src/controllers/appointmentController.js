const Appointment = require("../models/Appointment");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

/**
 * §5.2's field list gives Appointment a single `user` ref (not an
 * enrollees array), so structurally each document represents one
 * bookable slot for one person — `capacity` is preserved as a field per
 * the spec but isn't independently enforceable as multi-person capacity
 * with this schema. An admin creating a "10-person" slot would create 10
 * Appointment documents with the same title/date, which is also how the
 * excluded /seed dev helper populated sample data in the source.
 */

const listAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Appointment.find(filter).sort("date").skip(skip).limit(limit),
    Appointment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const myAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { user: req.user._id };

  const [data, total] = await Promise.all([
    Appointment.find(filter).sort("date").skip(skip).limit(limit),
    Appointment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.create({ ...req.body, status: "Open" });
  res.status(201).json({ success: true, data: appointment });
});

const enrollAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError("Appointment not found", 404);
  if (appointment.status !== "Open") {
    throw new AppError(`This appointment is not open for enrollment (status: ${appointment.status})`, 400);
  }

  appointment.user = req.user._id;
  appointment.phone = req.body.phone;
  appointment.emergencyContact = req.body.emergencyContact;
  appointment.appliedAt = new Date();
  appointment.status = "Full";
  await appointment.save();

  res.status(200).json({ success: true, data: appointment });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError("Appointment not found", 404);

  const isOwner = appointment.user && appointment.user.toString() === req.user._id.toString();
  const isStaff = ["staff", "admin", "super_admin"].includes(req.user.role);
  if (!isOwner && !isStaff) throw new AppError("You do not have permission to cancel this appointment", 403);

  appointment.user = undefined;
  appointment.phone = undefined;
  appointment.emergencyContact = undefined;
  appointment.appliedAt = undefined;
  appointment.status = "Open";
  await appointment.save();

  res.status(200).json({ success: true, data: appointment });
});

const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError("Appointment not found", 404);

  Object.assign(appointment, req.body);
  await appointment.save();

  res.status(200).json({ success: true, data: appointment });
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError("Appointment not found", 404);

  await appointment.deleteOne();
  res.status(200).json({ success: true, message: "Appointment deleted" });
});

module.exports = {
  listAppointments,
  myAppointments,
  createAppointment,
  enrollAppointment,
  cancelAppointment,
  updateAppointment,
  deleteAppointment,
};
