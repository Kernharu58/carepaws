const { z } = require("zod");

const scoreValue = z.number().int().min(1).max(5);

const scoresSchema = z.object({
  housingStability: scoreValue,
  financialReadiness: scoreValue,
  petExperience: scoreValue,
  lifestyleMatch: scoreValue,
  familyCommitment: scoreValue,
  knowledgeOfPet: scoreValue,
});

// Deliberately no totalScore/riskLevel fields — those are always
// server-computed (§5.2), so the schema doesn't even give a client a slot
// to put them in.
const createRiskAssessmentSchema = z
  .object({
    application: z.string().min(1),
    applicant: z.string().min(1),
    pet: z.string().min(1),
    scores: scoresSchema,
    notes: z.string().max(2000).optional(),
    redFlags: z.array(z.string().max(200)).optional(),
    recommendation: z.enum(["Approve", "Reject", "Further Review"]).optional(),
  })
  .strict();

const updateRiskAssessmentSchema = z
  .object({
    scores: scoresSchema.optional(),
    notes: z.string().max(2000).optional(),
    redFlags: z.array(z.string().max(200)).optional(),
    recommendation: z.enum(["Approve", "Reject", "Further Review"]).optional(),
  })
  .strict();

module.exports = { createRiskAssessmentSchema, updateRiskAssessmentSchema };
