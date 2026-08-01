const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["Adoption Drive", "Fundraiser", "Training", "Community", "Volunteer", "Other"],
      default: "Other",
    },
    date: { type: Date, required: true, index: true },
    endDate: { type: Date },
    location: { type: String },
    isOnline: { type: Boolean, default: false },
    onlineLink: { type: String },
    maxAttendees: { type: Number },
    currentAttendees: { type: Number, default: 0 },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    registeredAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["registered", "attended", "cancelled"], default: "registered" },
    notes: { type: String },
  },
  { timestamps: true }
);
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

const eventVolunteerAssignmentSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "Volunteer", required: true, index: true },
    role: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["assigned", "confirmed", "completed", "cancelled"],
      default: "assigned",
    },
    hoursLogged: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
const EventRegistration =
  mongoose.models.EventRegistration || mongoose.model("EventRegistration", eventRegistrationSchema);
const EventVolunteerAssignment =
  mongoose.models.EventVolunteerAssignment ||
  mongoose.model("EventVolunteerAssignment", eventVolunteerAssignmentSchema);

module.exports = { Event, EventRegistration, EventVolunteerAssignment };
