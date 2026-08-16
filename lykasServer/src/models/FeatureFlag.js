const mongoose = require("mongoose");

const featureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FeatureFlag || mongoose.model("FeatureFlag", featureFlagSchema);
