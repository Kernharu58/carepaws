const { z } = require("zod");

const createCheckoutSchema = z
  .object({
    type: z.enum(["donation", "adoption_fee", "event_fee"]),
    amount: z.number().int().positive("amount must be a positive integer (PHP centavos)"),
    description: z.string().trim().min(1).max(300).optional(),
    refModel: z.enum(["Application", "Event"]).optional(),
    refId: z.string().optional(),
  })
  .strict()
  .refine((data) => (data.type === "donation" ? true : Boolean(data.refModel && data.refId)), {
    message: "refModel and refId are required for adoption_fee and event_fee payments",
    path: ["refId"],
  });

const refundSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();

module.exports = { createCheckoutSchema, refundSchema };
