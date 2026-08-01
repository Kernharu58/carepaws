const mongoose = require("mongoose");

const emergencyReportSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["stray_animal", "injured_animal", "abuse_report", "abandoned_animal", "other"],
      required: true,
    },
    animalType: { type: String },
    description: { type: String, required: true },
    location: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    contactName: { type: String },
    contactPhone: { type: String },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
    resolutionNote: { type: String },
    linkedPet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.EmergencyReport || mongoose.model("EmergencyReport", emergencyReportSchema);
