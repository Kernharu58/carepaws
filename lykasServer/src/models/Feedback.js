const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["general", "complaint", "review", "suggestion"], required: true },
    rating: { type: Number, min: 1, max: 5 },
    subject: { type: String },
    message: { type: String, required: true },
    relatedPet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet" },
    status: {
      type: String,
      enum: ["new", "in_review", "responded", "resolved", "archived"],
      default: "new",
      index: true,
    },
    isPublic: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    adminResponse: { type: String },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
