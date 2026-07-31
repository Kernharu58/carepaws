const { z } = require("zod");

const createHomeVisitSchema = z
  .object({
    application: z.string().min(1),
    applicant: z.string().min(1),
    pet: z.string().min(1),
    scheduledDate: z.coerce.date(),
    address: z.string().max(300).optional(),
    assignedTo: z.string().optional(),
  })
  .strict();

const updateHomeVisitSchema = z
  .object({
    scheduledDate: z.coerce.date().optional(),
    address: z.string().max(300).optional(),
    assignedTo: z.string().optional(),
    status: z.enum(["scheduled", "completed", "cancelled", "rescheduled", "no-show"]).optional(),
  })
  .strict();

const reportSchema = z
  .object({
    livingSpace: z.string().max(1000).optional(),
    safetyCheck: z.enum(["Pass", "Fail", "Needs Improvement"]).optional(),
    yardOrOutdoor: z.string().max(1000).optional(),
    otherPets: z.string().max(1000).optional(),
    householdMembers: z.string().max(1000).optional(),
    overallImpression: z.string().max(2000).optional(),
    recommendation: z.enum(["Approve", "Reject", "Needs Follow-up"]).optional(),
  })
  .strict();

const completeHomeVisitSchema = z
  .object({
    result: z.enum(["passed", "failed", "pending"]),
    report: reportSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const cancelHomeVisitSchema = z
  .object({
    cancelReason: z.string().max(500).optional(),
  })
  .strict();

module.exports = {
  createHomeVisitSchema,
  updateHomeVisitSchema,
  completeHomeVisitSchema,
  cancelHomeVisitSchema,
};
