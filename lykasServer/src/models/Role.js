const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    description: { type: String },
    // "*" grants every permission — preserved from the source's wildcard convention.
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Role || mongoose.model("Role", roleSchema);
