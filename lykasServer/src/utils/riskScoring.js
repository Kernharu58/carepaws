const SCORE_DIMENSIONS = [
  "housingStability",
  "financialReadiness",
  "petExperience",
  "lifestyleMatch",
  "familyCommitment",
  "knowledgeOfPet",
];

/**
 * §5.2 — reproduces the exact scoring algorithm: totalScore is the sum of
 * six 1–5 dimension scores (range 6–30); riskLevel is "Low" at >=24,
 * "Medium" at >=15, otherwise "High". This is deliberately the only place
 * this math happens — the RiskAssessment model's pre-save hook calls this
 * rather than trusting a client-supplied totalScore/riskLevel.
 */
function computeRiskAssessment(scores) {
  const totalScore = SCORE_DIMENSIONS.reduce((sum, key) => sum + (scores[key] || 0), 0);

  let riskLevel;
  if (totalScore >= 24) riskLevel = "Low";
  else if (totalScore >= 15) riskLevel = "Medium";
  else riskLevel = "High";

  return { totalScore, riskLevel };
}

module.exports = { SCORE_DIMENSIONS, computeRiskAssessment };
