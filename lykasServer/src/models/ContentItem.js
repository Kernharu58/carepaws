const mongoose = require("mongoose");

const contentItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["faq", "policy", "page", "announcement"], required: true, index: true },
    title: { type: String, required: true },
    body: { type: String },
    category: { type: String },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false, index: true },
    slug: { type: String, unique: true, sparse: true, index: true },
    version: { type: Number, default: 1 },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ContentItem || mongoose.model("ContentItem", contentItemSchema);
