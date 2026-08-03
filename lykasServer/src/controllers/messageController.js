const Message = require("../models/Message");
const { AppError, asyncHandler } = require("../utils/AppError");

function isStaff(user) {
  return ["staff", "admin", "super_admin"].includes(user.role);
}

/** GET /api/messages/:userId — protected; the requester must own the conversation or be staff. */
const conversationHistory = asyncHandler(async (req, res) => {
  if (req.params.userId !== req.user._id.toString() && !isStaff(req.user)) {
    throw new AppError("You do not have permission to view this conversation", 403);
  }

  const messages = await Message.find({ userId: req.params.userId }).sort("createdAt");
  res.status(200).json({ success: true, data: messages });
});

/** GET /api/chat-sessions — staff-only; every user with a conversation, most-recent-message-first. */
const chatSessions = asyncHandler(async (req, res) => {
  const sessions = await Message.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$userId",
        lastMessage: { $first: "$text" },
        lastMessageAt: { $first: "$createdAt" },
        lastSender: { $first: "$sender" },
      },
    },
    { $sort: { lastMessageAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        userId: "$_id",
        displayName: "$user.displayName",
        email: "$user.email",
        profilePicture: "$user.profilePicture",
        lastMessage: 1,
        lastMessageAt: 1,
        lastSender: 1,
        _id: 0,
      },
    },
  ]);

  res.status(200).json({ success: true, data: sessions });
});

module.exports = { conversationHistory, chatSessions };
