const mongoose = require("mongoose");

const shelterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    contactPerson: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    capacity: { type: Number, default: 0 },
    currentOccupancy: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["main_shelter", "foster_hub", "clinic", "satellite"],
      default: "main_shelter",
    },
    status: {
      type: String,
      enum: ["active", "at_capacity", "under_maintenance", "inactive"],
      default: "active",
      index: true,
    },
    operatingHours: { type: String },
    notes: { type: String },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Shelter || mongoose.model("Shelter", shelterSchema);
