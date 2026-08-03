const { z } = require("zod");

const createInKindDonationSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    quantity: z.coerce.number().min(0).optional(),
    unit: z.string().max(30).optional(),
    items: z
      .array(z.object({ name: z.string().max(150), quantity: z.number().optional(), unit: z.string().optional() }))
      .optional(),
    dropOff: z.enum(["walk_in", "schedule", "courier"]).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateStatusSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "received", "cancelled"]),
    staffNote: z.string().max(1000).optional(),
  })
  .strict();

const bulkStatusSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(["pending", "confirmed", "received", "cancelled"]),
  })
  .strict();

module.exports = { createInKindDonationSchema, updateStatusSchema, bulkStatusSchema };
