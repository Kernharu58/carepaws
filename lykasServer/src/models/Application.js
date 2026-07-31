const mongoose = require("mongoose");

const stageHistoryEntrySchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const internalNoteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    phone: { type: String },
    address: { type: String },
    experience: { type: String },
    householdSize: { type: Number },
    isRenting: { type: Boolean },
    landlordApproval: { type: Boolean },
    type: { type: String, enum: ["adoption", "foster"], default: "adoption", index: true },
    fosterPeriod: { type: String },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    stage: {
      type: String,
      enum: [
        "submitted",
        "document_review",
        "interview",
        "home_visit",
        "risk_assessment",
        "approved",
        "adoption_scheduled",
        "completed",
        "rejected",
      ],
      default: "submitted",
      index: true,
    },
    stageHistory: [stageHistoryEntrySchema],

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },

    // Hidden from the applicant — surfaced only via the staff-only /notes routes.
    internalNotes: [internalNoteSchema],
  },
  { timestamps: true }
);

applicationSchema.index({ pet: 1, applicant: 1, status: 1 });

module.exports = mongoose.models.Application || mongoose.model("Application", applicationSchema);
