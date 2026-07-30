const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    species: { type: String, enum: ["Dog", "Cat", "Other"], required: true },
    breed: { type: String, trim: true },
    age: { type: Number },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    size: { type: String, enum: ["Small", "Medium", "Large"] },
    weight: { type: Number },
    temperament: {
      type: String,
      enum: ["Calm", "Playful", "Shy", "Energetic", "Affectionate", "Independent"],
    },
    energyLevel: { type: String, enum: ["Low", "Medium", "High"] },
    healthStatus: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["Available", "Pending", "Adopted", "Foster"],
      default: "Available",
      index: true,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Backs the public catalog's filter UX without a full collection scan (§5.2).
petSchema.index({ status: 1, species: 1 });
petSchema.index({ name: "text", breed: "text", description: "text" });

module.exports = mongoose.models.Pet || mongoose.model("Pet", petSchema);
