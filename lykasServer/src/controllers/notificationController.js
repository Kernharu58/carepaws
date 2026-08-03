const Notification = require("../models/Notification");
const { asyncHandler, AppError } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { notifyMany } = require("../utils/notificationHelper");

const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.status(200).json({ success: true, data: { count } });
});

const myNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { recipient: req.user._id };
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

  const [data, total] = await Promise.all([
    Notification.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
  if (!notification) throw new AppError("Notification not found", 404);

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.status(200).json({ success: true, message: "All notifications marked as read" });
});

const deleteOne = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  if (!notification) throw new AppError("Notification not found", 404);
  res.status(200).json({ success: true, message: "Notification deleted" });
});

const deleteAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  res.status(200).json({ success: true, message: "All notifications deleted" });
});

// --- Admin ---

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.recipient) filter.recipient = req.query.recipient;
  if (req.query.type) filter.type = req.query.type;

  const [data, total] = await Promise.all([
    Notification.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("recipient", "displayName email")
      .populate("sender", "displayName"),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

/** POST /send — admin broadcasts a notification to an explicit list of recipients. */
const sendNotification = asyncHandler(async (req, res) => {
  const { recipients, type, title, message, refModel, refId } = req.body;

  const created = await notifyMany(recipients, {
    sender: req.user._id,
    type,
    title,
    message,
    refModel: refModel || null,
    refId: refId || null,
  });

  res.status(201).json({ success: true, data: { sent: created.filter(Boolean).length, total: recipients.length } });
});

module.exports = {
  unreadCount,
  myNotifications,
  markRead,
  markAllRead,
  deleteOne,
  deleteAll,
  adminList,
  sendNotification,
};
