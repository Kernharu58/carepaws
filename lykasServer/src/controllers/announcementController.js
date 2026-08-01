const Announcement = require("../models/Announcement");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

/** GET /active (public) — currently-active announcements for the requester's audience. */
const activeAnnouncements = asyncHandler(async (req, res) => {
  const now = new Date();
  const audience = req.query.audience === "admin" ? "admin" : "user"; // callers self-declare; server still scopes by isActive/date

  const announcements = await Announcement.find({
    isActive: true,
    audience: { $in: [audience, "all"] },
    startAt: { $lte: now },
    $or: [{ endAt: { $exists: false } }, { endAt: null }, { endAt: { $gte: now } }],
  }).sort("-level -startAt");

  res.status(200).json({ success: true, data: announcements });
});

const listAnnouncements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.audience) filter.audience = req.query.audience;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

  const [data, total] = await Promise.all([
    Announcement.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: announcement });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new AppError("Announcement not found", 404);

  Object.assign(announcement, req.body);
  await announcement.save();

  res.status(200).json({ success: true, data: announcement });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new AppError("Announcement not found", 404);

  await announcement.deleteOne();
  res.status(200).json({ success: true, message: "Announcement deleted" });
});

module.exports = { activeAnnouncements, listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
