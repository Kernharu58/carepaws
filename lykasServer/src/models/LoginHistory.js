const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, required: true },
    success: { type: Boolean, required: true },
    reason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

loginHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.LoginHistory || mongoose.model("LoginHistory", loginHistorySchema);
