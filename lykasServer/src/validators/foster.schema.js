const { z } = require("zod");

const createFosterSchema = z
  .object({
    pet: z.string().min(1),
    fosterer: z.string().min(1),
    application: z.string().optional(),
    expectedEndDate: z.coerce.date().optional(),
    trialDurationDays: z.coerce.number().int().min(1).optional(),
    weeklyReportsRequired: z.coerce.number().int().min(0).optional(),
    fosterAgreementSigned: z.boolean().optional(),
    pickupNotes: z.string().max(1000).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateFosterSchema = z
  .object({
    expectedEndDate: z.coerce.date().optional(),
    weeklyReportsRequired: z.coerce.number().int().min(0).optional(),
    fosterAgreementSigned: z.boolean().optional(),
    staffNotes: z.string().max(1000).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const endFosterSchema = z
  .object({
    outcome: z.enum(["ADOPTED", "RETURNED", "EXTENDED"]),
    returnNotes: z.string().max(1000).optional(),
    staffNotes: z.string().max(1000).optional(),
  })
  .strict();

const cancelFosterSchema = z
  .object({
    staffNotes: z.string().max(1000).optional(),
  })
  .strict();

const createFosterReportSchema = z
  .object({
    weekNumber: z.coerce.number().int().min(1),
    reportDate: z.coerce.date().optional(),
    weightChange: z.string().max(100).optional(),
    appetite: z.enum(["Excellent", "Good", "Fair", "Poor"]).optional(),
    energy: z.enum(["Very Active", "Active", "Low", "Lethargic"]).optional(),
    behavior: z.string().max(2000).optional(),
    healthConcerns: z.string().max(2000).optional(),
    vetVisitRequired: z.boolean().optional(),
    overallProgress: z.enum(["Excellent", "Good", "Fair", "Needs Attention"]).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const reviewFosterReportSchema = z
  .object({
    adminNotes: z.string().max(1000).optional(),
  })
  .strict();

module.exports = {
  createFosterSchema,
  updateFosterSchema,
  endFosterSchema,
  cancelFosterSchema,
  createFosterReportSchema,
  reviewFosterReportSchema,
};
