const mongoose = require("mongoose");

const apiLogSchema = new mongoose.Schema(
  {
    method: { type: String, required: true },
    path: { type: String, required: true, index: true },
    statusCode: { type: Number },
    durationMs: { type: Number },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

apiLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.ApiLog || mongoose.model("ApiLog", apiLogSchema);
