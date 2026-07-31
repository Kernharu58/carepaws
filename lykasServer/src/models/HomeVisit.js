const mongoose = require("mongoose");

const homeVisitReportSchema = new mongoose.Schema(
  {
    livingSpace: { type: String },
    safetyCheck: { type: String, enum: ["Pass", "Fail", "Needs Improvement"] },
    yardOrOutdoor: { type: String },
    otherPets: { type: String },
    householdMembers: { type: String },
    overallImpression: { type: String },
    recommendation: { type: String, enum: ["Approve", "Reject", "Needs Follow-up"] },
  },
  { _id: false }
);

const homeVisitSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    scheduledDate: { type: Date, required: true },
    address: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled", "no-show"],
      default: "scheduled",
      index: true,
    },
    report: { type: homeVisitReportSchema, default: () => ({}) },
    result: { type: String, enum: ["passed", "failed", "pending"], default: "pending" },
    notes: { type: String },
    cancelReason: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.HomeVisit || mongoose.model("HomeVisit", homeVisitSchema);
