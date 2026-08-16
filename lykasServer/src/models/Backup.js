const mongoose = require("mongoose");

const backupSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["manual", "automatic"], default: "manual" },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
    filePath: { type: String },
    fileName: { type: String },
    sizeBytes: { type: Number },
    collections: [{ type: String }],
    documentCount: { type: Number },
    error: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Backup || mongoose.model("Backup", backupSchema);
