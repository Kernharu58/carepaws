const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, select: false },
    prefix: { type: String, required: true }, // shown to the user for identification, e.g. "cpk_1a2b"
    scopes: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ApiKey || mongoose.model("ApiKey", apiKeySchema);
