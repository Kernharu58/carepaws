const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    durationHours: { type: Number, default: 1 },
    capacity: { type: Number, default: 1 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phone: { type: String },
    emergencyContact: { type: String },
    notes: { type: String },
    appliedAt: { type: Date },
    status: { type: String, enum: ["Open", "Full", "Completed"], default: "Open", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
