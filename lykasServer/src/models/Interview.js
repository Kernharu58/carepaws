const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    scheduledDate: { type: Date, required: true },
    method: { type: String, enum: ["In-person", "Video call", "Phone call"], required: true },
    location: { type: String },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled",
      index: true,
    },
    result: { type: String, enum: ["passed", "failed", "pending"], default: "pending" },
    notes: { type: String },
    cancelReason: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Interview || mongoose.model("Interview", interviewSchema);
