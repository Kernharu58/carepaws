const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // The conversation owner — always the non-staff participant, so a
    // conversation is addressable as "userId's conversation with the
    // shelter" regardless of which staff member replies.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // §5.2: the real Socket.io handler only ever writes "user" or "shelter"
    // (derived server-side, never trusting a client-supplied sender —
    // see socket.js). "admin" is kept in the enum for a possible future
    // system-authored message type, but no write path uses it yet.
    sender: { type: String, enum: ["user", "admin", "shelter"], required: true },
    text: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

messageSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
