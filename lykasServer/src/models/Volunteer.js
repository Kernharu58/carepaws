const mongoose = require("mongoose");

const volunteerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    phone: { type: String },
    address: { type: String },
    motivation: { type: String },
    availability: [
      { type: String, enum: ["Weekday mornings", "Weekday afternoons", "Weekends", "Flexible"] },
    ],
    skills: [{ type: String }],
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "inactive"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    totalHours: { type: Number, default: 0 },
    notes: { type: String },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Volunteer || mongoose.model("Volunteer", volunteerSchema);
