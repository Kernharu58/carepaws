const { z } = require("zod");

const createInterviewSchema = z
  .object({
    application: z.string().min(1),
    applicant: z.string().min(1),
    pet: z.string().min(1),
    scheduledDate: z.coerce.date(),
    method: z.enum(["In-person", "Video call", "Phone call"]),
    location: z.string().max(300).optional(),
    conductedBy: z.string().optional(),
  })
  .strict();

const updateInterviewSchema = z
  .object({
    scheduledDate: z.coerce.date().optional(),
    method: z.enum(["In-person", "Video call", "Phone call"]).optional(),
    location: z.string().max(300).optional(),
    conductedBy: z.string().optional(),
  })
  .strict();

const completeInterviewSchema = z
  .object({
    result: z.enum(["passed", "failed", "pending"]),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const cancelInterviewSchema = z
  .object({
    cancelReason: z.string().max(500).optional(),
  })
  .strict();

module.exports = {
  createInterviewSchema,
  updateInterviewSchema,
  completeInterviewSchema,
  cancelInterviewSchema,
};
