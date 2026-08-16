const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["server", "admin", "mobile"], default: "server", index: true },
    message: { type: String, required: true },
    stack: { type: String },
    route: { type: String },
    method: { type: String },
    statusCode: { type: Number },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    severity: { type: String, enum: ["info", "warning", "error", "fatal"], default: "error", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ErrorLog || mongoose.model("ErrorLog", errorLogSchema);
