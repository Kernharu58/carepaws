const { z } = require("zod");

const createFeedbackSchema = z
  .object({
    type: z.enum(["general", "complaint", "review", "suggestion"]),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    subject: z.string().max(200).optional(),
    message: z.string().trim().min(1).max(3000),
    relatedPet: z.string().optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

const updateFeedbackSchema = z
  .object({
    status: z.enum(["new", "in_review", "responded", "resolved", "archived"]).optional(),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    adminResponse: z.string().max(3000).optional(),
  })
  .strict();

module.exports = { createFeedbackSchema, updateFeedbackSchema };
