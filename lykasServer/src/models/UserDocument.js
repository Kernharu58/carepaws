const mongoose = require("mongoose");

const userDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    type: {
      type: String,
      enum: ["government_id", "proof_of_address", "proof_of_income", "house_photo", "pet_owner_agreement", "other"],
      required: true,
    },
    label: { type: String },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending", index: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    // Only meaningful for ID-type documents — powers the "expired
    // documents" reminder job once the reminder-jobs pass wires it in.
    expiresAt: { type: Date },
    rejectedReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.models.UserDocument || mongoose.model("UserDocument", userDocumentSchema);
