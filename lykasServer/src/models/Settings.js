const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    address: { type: String },
    phone: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
