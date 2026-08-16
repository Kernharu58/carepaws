const { z } = require("zod");

const createUserDocumentSchema = z
  .object({
    application: z.string().optional(),
    type: z.enum(["government_id", "proof_of_address", "proof_of_income", "house_photo", "pet_owner_agreement", "other"]),
    label: z.string().max(150).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .strict();

const verifyUserDocumentSchema = z
  .object({
    status: z.enum(["pending", "verified", "rejected"]),
    rejectedReason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

module.exports = { createUserDocumentSchema, verifyUserDocumentSchema };
