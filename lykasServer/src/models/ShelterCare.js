const mongoose = require("mongoose");

const healthCheckSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    weight: { type: Number },
    temperature: { type: Number },
    condition: { type: String, enum: ["Excellent", "Good", "Fair", "Poor", "Critical"], required: true },
    notes: { type: String },
    flagged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const feedingLogSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    meal: { type: String, enum: ["Morning", "Afternoon", "Evening"], required: true },
    foodType: { type: String },
    amount: { type: String },
    eaten: { type: String, enum: ["All", "Most", "Half", "Little", "None"], default: "All" },
    notes: { type: String },
  },
  { timestamps: true }
);

const behavioralObservationSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    observedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    mood: { type: String, enum: ["Happy", "Calm", "Anxious", "Aggressive", "Lethargic", "Playful"] },
    sociability: { type: String, enum: ["Friendly", "Neutral", "Shy", "Aggressive"] },
    notes: { type: String },
    flagged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const cageAssignmentSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    cageNumber: { type: String, required: true },
    section: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedAt: { type: Date, default: Date.now },
    releasedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

const quarantinePeriodSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    reason: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

const HealthCheck = mongoose.models.HealthCheck || mongoose.model("HealthCheck", healthCheckSchema);
const FeedingLog = mongoose.models.FeedingLog || mongoose.model("FeedingLog", feedingLogSchema);
const BehavioralObservation =
  mongoose.models.BehavioralObservation ||
  mongoose.model("BehavioralObservation", behavioralObservationSchema);
const CageAssignment =
  mongoose.models.CageAssignment || mongoose.model("CageAssignment", cageAssignmentSchema);
const QuarantinePeriod =
  mongoose.models.QuarantinePeriod || mongoose.model("QuarantinePeriod", quarantinePeriodSchema);

module.exports = { HealthCheck, FeedingLog, BehavioralObservation, CageAssignment, QuarantinePeriod };
