const mongoose = require("mongoose");

const fosterSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    fosterer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    expectedEndDate: { type: Date },
    trialDurationDays: { type: Number },
    weeklyReportsRequired: { type: Number, default: 0 },
    weeklyReportsSubmitted: { type: Number, default: 0 },

    outcome: { type: String, enum: ["ADOPTED", "RETURNED", "EXTENDED", null], default: null },
    staffNotes: { type: String },
    closedAt: { type: Date },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active", index: true },
    fosterAgreementSigned: { type: Boolean, default: false },
    pickupNotes: { type: String },
    returnNotes: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    endedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

const fosterReportSchema = new mongoose.Schema(
  {
    foster: { type: mongoose.Schema.Types.ObjectId, ref: "Foster", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    fosterer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    weekNumber: { type: Number, required: true },
    reportDate: { type: Date, default: Date.now },
    weightChange: { type: String },
    appetite: { type: String, enum: ["Excellent", "Good", "Fair", "Poor"] },
    energy: { type: String, enum: ["Very Active", "Active", "Low", "Lethargic"] },
    behavior: { type: String },
    healthConcerns: { type: String },
    vetVisitRequired: { type: Boolean, default: false },
    overallProgress: { type: String, enum: ["Excellent", "Good", "Fair", "Needs Attention"] },
    notes: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

fosterReportSchema.index({ foster: 1, weekNumber: 1 }, { unique: true });

const Foster = mongoose.models.Foster || mongoose.model("Foster", fosterSchema);
const FosterReport = mongoose.models.FosterReport || mongoose.model("FosterReport", fosterReportSchema);

module.exports = { Foster, FosterReport };
