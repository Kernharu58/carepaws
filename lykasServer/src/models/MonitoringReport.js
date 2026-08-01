const mongoose = require("mongoose");

const monitoringReportSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    reportDate: { type: Date, default: Date.now },
    reportMonth: { type: String }, // e.g. "2026-08" — which monthly check-in this covers
    petName: { type: String },
    currentWeight: { type: Number },
    diet: { type: String },
    exerciseRoutine: { type: String },
    vetVisits: { type: String },
    overallCondition: { type: String, enum: ["Excellent", "Good", "Fair", "Poor"] },
    behaviorAtHome: { type: String },
    issuesOrConcerns: { type: String },
    additionalPets: { type: String },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    status: { type: String, enum: ["pending", "reviewed", "flagged"], default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MonitoringReport || mongoose.model("MonitoringReport", monitoringReportSchema);
