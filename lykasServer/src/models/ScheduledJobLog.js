const mongoose = require("mongoose");

const scheduledJobLogSchema = new mongoose.Schema(
  {
    jobKey: { type: String, required: true, index: true },
    label: { type: String },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    durationMs: { type: Number },
    itemsProcessed: { type: Number },
    triggeredBy: { type: String, enum: ["cron", "manual"], default: "cron" },
    triggeredByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

scheduledJobLogSchema.index({ jobKey: 1, createdAt: -1 });

module.exports = mongoose.models.ScheduledJobLog || mongoose.model("ScheduledJobLog", scheduledJobLogSchema);
