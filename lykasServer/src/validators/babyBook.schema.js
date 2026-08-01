const { z } = require("zod");

const createBabyBookEntrySchema = z
  .object({
    pet: z.string().min(1),
    date: z.coerce.date().optional(),
    title: z.string().trim().min(1).max(150),
    content: z.string().max(3000).optional(),
    imageUrl: z.string().url().optional(),
    category: z.enum(["Milestone", "Health", "Funny Moment", "Training", "First Time", "General"]).optional(),
  })
  .strict();

const updateBabyBookEntrySchema = createBabyBookEntrySchema.omit({ pet: true }).partial();

module.exports = { createBabyBookEntrySchema, updateBabyBookEntrySchema };
