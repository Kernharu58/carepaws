const mongoose = require("mongoose");

const movementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["restock", "usage", "adjustment"], required: true },
    quantity: { type: Number, required: true },
    note: { type: String },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["food", "medical", "bedding", "cleaning", "equipment", "office", "other"],
      required: true,
      index: true,
    },
    quantity: { type: Number, default: 0 },
    unit: { type: String },
    minThreshold: { type: Number, default: 0 },
    location: { type: String },
    supplier: { type: String },
    notes: { type: String },
    lastRestockedAt: { type: Date },
    lastRestockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    movements: [movementSchema],
  },
  { timestamps: true }
);

inventoryItemSchema.index({ name: "text" });

module.exports = mongoose.models.InventoryItem || mongoose.model("InventoryItem", inventoryItemSchema);
