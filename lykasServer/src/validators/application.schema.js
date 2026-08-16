const { z } = require("zod");

const createApplicationSchema = z
  .object({
    pet: z.string().min(1),
    // Optional — only staff/admin can meaningfully use this (see the
    // controller); a regular user's own applicant is always themselves
    // regardless of what's sent here.
    applicant: z.string().optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(300).optional(),
    experience: z.string().trim().max(2000).optional(),
    householdSize: z.coerce.number().int().min(0).optional(),
    isRenting: z.boolean().optional(),
    landlordApproval: z.boolean().optional(),
    type: z.enum(["adoption", "foster"]).optional(),
    fosterPeriod: z.string().max(200).optional(),
  })
  .strict();

const updateStatusSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
  })
  .strict();

const updateStageSchema = z
  .object({
    stage: z.enum([
      "submitted",
      "document_review",
      "interview",
      "home_visit",
      "risk_assessment",
      "approved",
      "adoption_scheduled",
      "completed",
      "rejected",
    ]),
    note: z.string().max(1000).optional(),
  })
  .strict();

const bulkStatusSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(["pending", "approved", "rejected"]),
  })
  .strict();

const addNoteSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
  })
  .strict();

module.exports = {
  createApplicationSchema,
  updateStatusSchema,
  updateStageSchema,
  bulkStatusSchema,
  addNoteSchema,
};
