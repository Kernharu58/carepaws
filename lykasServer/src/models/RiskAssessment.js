const mongoose = require("mongoose");
const { computeRiskAssessment } = require("../utils/riskScoring");

const scoreField = { type: Number, required: true, min: 1, max: 5 };

const riskAssessmentSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    scores: {
      housingStability: scoreField,
      financialReadiness: scoreField,
      petExperience: scoreField,
      lifestyleMatch: scoreField,
      familyCommitment: scoreField,
      knowledgeOfPet: scoreField,
    },

    // Both are always recomputed in the pre-save hook below — never accept
    // these directly from a client payload (§5.2: "never trust a
    // client-supplied riskLevel or totalScore").
    totalScore: { type: Number, min: 6, max: 30 },
    riskLevel: { type: String, enum: ["Low", "Medium", "High"] },

    notes: { type: String },
    redFlags: [{ type: String }],
    recommendation: { type: String, enum: ["Approve", "Reject", "Further Review"] },
  },
  { timestamps: true }
);

riskAssessmentSchema.pre("save", function computeScore(next) {
  const { totalScore, riskLevel } = computeRiskAssessment(this.scores);
  this.totalScore = totalScore;
  this.riskLevel = riskLevel;
  next();
});

module.exports = mongoose.models.RiskAssessment || mongoose.model("RiskAssessment", riskAssessmentSchema);
