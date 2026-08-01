const Volunteer = require("../models/Volunteer");
const AuditLog = require("../models/AuditLog");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { softDelete, restore } = require("../utils/softDeleteMixin");
const { logAudit } = require("../utils/auditLogger");
const { sendCsv } = require("../utils/exportUtil");

const searchFields = ["motivation"];
const filterFields = ["status"];

const registerVolunteer = asyncHandler(async (req, res) => {
  const existing = await Volunteer.findOne({ user: req.user._id });
  if (existing) throw new AppError("You have already submitted a volunteer application", 400);

  const volunteer = await Volunteer.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, data: volunteer });
});

const getMyVolunteerProfile = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findOne({ user: req.user._id, isDeleted: false });
  if (!volunteer) throw new AppError("No volunteer application found for this account", 404);
  res.status(200).json({ success: true, data: volunteer });
});

const updateMyVolunteerProfile = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findOne({ user: req.user._id, isDeleted: false });
  if (!volunteer) throw new AppError("No volunteer application found for this account", 404);

  Object.assign(volunteer, req.body);
  await volunteer.save();

  res.status(200).json({ success: true, data: volunteer });
});

const listVolunteers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });
  if (String(req.query.includeDeleted).toLowerCase() !== "true") filter.isDeleted = false;

  const [data, total] = await Promise.all([
    Volunteer.find(filter).sort(sort).skip(skip).limit(limit).populate("user", "displayName email phone"),
    Volunteer.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const exportVolunteers = asyncHandler(async (req, res) => {
  const { filter } = buildListQuery(req.query, { searchFields, filterFields });
  filter.isDeleted = false;

  const volunteers = await Volunteer.find(filter).populate("user", "displayName email").lean();

  sendCsv(
    res,
    "volunteers.csv",
    volunteers.map((v) => ({ ...v, name: v.user?.displayName, email: v.user?.email })),
    [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
      { key: "totalHours", label: "Total Hours" },
      { key: "createdAt", label: "Applied" },
    ]
  );
});

const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  const result = await Volunteer.updateMany(
    { _id: { $in: ids } },
    { status, reviewedBy: req.user._id, reviewedAt: new Date() }
  );

  await logAudit({
    actor: req.user._id,
    action: "volunteer.bulk_status",
    metadata: { ids, status, matched: result.matchedCount },
    req,
  });

  res.status(200).json({ success: true, message: `Updated ${result.modifiedCount} volunteer(s)` });
});

const getVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id).populate("user", "displayName email phone");
  if (!volunteer) throw new AppError("Volunteer not found", 404);
  res.status(200).json({ success: true, data: volunteer });
});

const updateVolunteerStatus = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) throw new AppError("Volunteer not found", 404);

  const previousValues = { status: volunteer.status };
  volunteer.status = req.body.status;
  volunteer.reviewedBy = req.user._id;
  volunteer.reviewedAt = new Date();
  await volunteer.save();

  await logAudit({
    actor: req.user._id,
    action: "volunteer.status.update",
    entityType: "Volunteer",
    entityId: volunteer._id,
    previousValues,
    newValues: { status: volunteer.status },
    req,
  });

  res.status(200).json({ success: true, data: volunteer });
});

const logHours = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) throw new AppError("Volunteer not found", 404);

  volunteer.totalHours += req.body.hours;
  await volunteer.save();

  // Keep the User record's own volunteerHours tally in sync too.
  const User = require("../models/User");
  await User.updateOne({ _id: volunteer.user }, { $inc: { volunteerHours: req.body.hours } });

  res.status(200).json({ success: true, data: volunteer });
});

const deleteVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await softDelete(Volunteer, req.params.id, req.user._id);
  if (!volunteer) throw new AppError("Volunteer not found", 404);

  await logAudit({
    actor: req.user._id,
    action: "volunteer.delete",
    entityType: "Volunteer",
    entityId: volunteer._id,
    req,
  });

  res.status(200).json({ success: true, message: "Volunteer removed" });
});

const restoreVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await restore(Volunteer, req.params.id);
  if (!volunteer) throw new AppError("Volunteer not found", 404);

  res.status(200).json({ success: true, data: volunteer });
});

const volunteerHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { entityType: "Volunteer", entityId: req.params.id };

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort("-createdAt").skip(skip).limit(limit).populate("actor", "displayName"),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

module.exports = {
  registerVolunteer,
  getMyVolunteerProfile,
  updateMyVolunteerProfile,
  listVolunteers,
  exportVolunteers,
  bulkUpdateStatus,
  getVolunteer,
  updateVolunteerStatus,
  logHours,
  deleteVolunteer,
  restoreVolunteer,
  volunteerHistory,
};
