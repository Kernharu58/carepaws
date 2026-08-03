const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", emailTemplateSchema);
