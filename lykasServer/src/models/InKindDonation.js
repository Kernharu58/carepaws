const mongoose = require("mongoose");

const donatedItemSchema = new mongoose.Schema(
  { name: { type: String }, quantity: { type: Number }, unit: { type: String } },
  { _id: false }
);

const inKindDonationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number },
    unit: { type: String },
    donatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [donatedItemSchema],
    dropOff: { type: String, enum: ["walk_in", "schedule", "courier"], default: "walk_in" },
    notes: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "received", "cancelled"],
      default: "pending",
      index: true,
    },
    staffNote: { type: String },
    receivedAt: { type: Date },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.InKindDonation || mongoose.model("InKindDonation", inKindDonationSchema);
