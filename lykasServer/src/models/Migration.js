const mongoose = require("mongoose");

const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    status: { type: String, enum: ["applied", "failed", "rolled_back"], default: "applied" },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Migration || mongoose.model("Migration", migrationSchema);
