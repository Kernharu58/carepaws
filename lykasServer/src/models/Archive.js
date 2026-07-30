const mongoose = require("mongoose");

const archiveSchema = new mongoose.Schema(
  {
    sourceCollection: { type: String, required: true, index: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    reason: { type: String },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Archive || mongoose.model("Archive", archiveSchema);
