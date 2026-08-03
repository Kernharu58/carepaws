const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ["Pet", "User", "Volunteer", "InKindDonation", "Shelter"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    // Future-proofed for an "applicant-visible" note type, but only
    // "internal" ships today (§5.2) — don't add values without a
    // corresponding UI to show them.
    visibility: { type: String, enum: ["internal"], default: "internal" },
  },
  { timestamps: true }
);

noteSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.models.Note || mongoose.model("Note", noteSchema);
