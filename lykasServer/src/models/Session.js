const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // SHA-256 hash of the refresh token — never the raw value (§11.6.2).
    token: { type: String, required: true, unique: true, select: false },
    ipAddress: { type: String },
    userAgent: { type: String },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Session || mongoose.model("Session", sessionSchema);
