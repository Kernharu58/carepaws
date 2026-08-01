const { z } = require("zod");

const createMonitoringReportSchema = z
  .object({
    pet: z.string().min(1),
    application: z.string().optional(),
    reportDate: z.coerce.date().optional(),
    reportMonth: z.string().max(20).optional(),
    petName: z.string().max(100).optional(),
    currentWeight: z.coerce.number().min(0).optional(),
    diet: z.string().max(1000).optional(),
    exerciseRoutine: z.string().max(1000).optional(),
    vetVisits: z.string().max(1000).optional(),
    overallCondition: z.enum(["Excellent", "Good", "Fair", "Poor"]).optional(),
    behaviorAtHome: z.string().max(2000).optional(),
    issuesOrConcerns: z.string().max(2000).optional(),
    additionalPets: z.string().max(500).optional(),
    satisfactionRating: z.coerce.number().int().min(1).max(5).optional(),
    comments: z.string().max(2000).optional(),
  })
  .strict();

const reviewMonitoringReportSchema = z
  .object({
    status: z.enum(["pending", "reviewed", "flagged"]),
    adminNotes: z.string().max(1000).optional(),
  })
  .strict();

module.exports = { createMonitoringReportSchema, reviewMonitoringReportSchema };
