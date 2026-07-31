const { computeRiskAssessment, SCORE_DIMENSIONS } = require("../../src/utils/riskScoring");

function scores(value) {
  return Object.fromEntries(SCORE_DIMENSIONS.map((key) => [key, value]));
}

describe("riskScoring.computeRiskAssessment", () => {
  it("sums all six dimensions for totalScore", () => {
    const { totalScore } = computeRiskAssessment({
      housingStability: 5,
      financialReadiness: 4,
      petExperience: 3,
      lifestyleMatch: 5,
      familyCommitment: 4,
      knowledgeOfPet: 3,
    });
    expect(totalScore).toBe(24);
  });

  it("returns the minimum possible score (6) when every dimension is 1", () => {
    const { totalScore } = computeRiskAssessment(scores(1));
    expect(totalScore).toBe(6);
  });

  it("returns the maximum possible score (30) when every dimension is 5", () => {
    const { totalScore } = computeRiskAssessment(scores(5));
    expect(totalScore).toBe(30);
  });

  it('classifies riskLevel as "Low" at exactly the 24 threshold', () => {
    // 24 = four 5s and two 2s, e.g.
    const { riskLevel, totalScore } = computeRiskAssessment({
      housingStability: 5,
      financialReadiness: 5,
      petExperience: 5,
      lifestyleMatch: 5,
      familyCommitment: 2,
      knowledgeOfPet: 2,
    });
    expect(totalScore).toBe(24);
    expect(riskLevel).toBe("Low");
  });

  it('classifies riskLevel as "Medium" just below the Low threshold (23)', () => {
    const { riskLevel, totalScore } = computeRiskAssessment({
      housingStability: 5,
      financialReadiness: 5,
      petExperience: 5,
      lifestyleMatch: 5,
      familyCommitment: 2,
      knowledgeOfPet: 1,
    });
    expect(totalScore).toBe(23);
    expect(riskLevel).toBe("Medium");
  });

  it('classifies riskLevel as "Medium" at exactly the 15 threshold', () => {
    const { riskLevel, totalScore } = computeRiskAssessment({
      housingStability: 3,
      financialReadiness: 3,
      petExperience: 3,
      lifestyleMatch: 2,
      familyCommitment: 2,
      knowledgeOfPet: 2,
    });
    expect(totalScore).toBe(15);
    expect(riskLevel).toBe("Medium");
  });

  it('classifies riskLevel as "High" just below the Medium threshold (14)', () => {
    const { riskLevel, totalScore } = computeRiskAssessment({
      housingStability: 3,
      financialReadiness: 2,
      petExperience: 2,
      lifestyleMatch: 2,
      familyCommitment: 3,
      knowledgeOfPet: 2,
    });
    expect(totalScore).toBe(14);
    expect(riskLevel).toBe("High");
  });

  it('classifies riskLevel as "High" at the minimum score (6)', () => {
    const { riskLevel } = computeRiskAssessment(scores(1));
    expect(riskLevel).toBe("High");
  });

  it("treats a missing dimension as 0 rather than throwing", () => {
    const { totalScore } = computeRiskAssessment({
      housingStability: 5,
      financialReadiness: 5,
      petExperience: 5,
      lifestyleMatch: 5,
      familyCommitment: 5,
      // knowledgeOfPet omitted
    });
    expect(totalScore).toBe(25);
  });
});
