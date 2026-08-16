const mongoose = require("mongoose");

const fileAssetSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String }, // Cloudinary public_id, needed to delete the remote asset
    category: {
      type: String,
      enum: ["adoption_document", "id_document", "medical_record", "image", "other"],
      required: true,
      index: true,
    },
    relatedModel: { type: String },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

fileAssetSchema.index({ relatedModel: 1, relatedId: 1 });

module.exports = mongoose.models.FileAsset || mongoose.model("FileAsset", fileAssetSchema);
