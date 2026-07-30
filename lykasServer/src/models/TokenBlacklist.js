const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    reason: {
      type: String,
      enum: ["logout", "account_suspended", "account_locked", "password_changed"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.TokenBlacklist || mongoose.model("TokenBlacklist", tokenBlacklistSchema);
