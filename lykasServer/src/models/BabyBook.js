const mongoose = require("mongoose");

const babyBookSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    title: { type: String, required: true },
    content: { type: String },
    // Not in §5.2's literal field list, but §6.2 describes this exact screen
    // as a "free-form photo/growth-journal timeline" — a baby book with no
    // way to attach a photo can't do what it's specified to do. Same
    // treatment as other flagged additions (pushToken, refresh tokens).
    imageUrl: { type: String },
    category: {
      type: String,
      enum: ["Milestone", "Health", "Funny Moment", "Training", "First Time", "General"],
      default: "General",
    },
  },
  { timestamps: true }
);

babyBookSchema.index({ pet: 1, date: -1 });

module.exports = mongoose.models.BabyBook || mongoose.model("BabyBook", babyBookSchema);
