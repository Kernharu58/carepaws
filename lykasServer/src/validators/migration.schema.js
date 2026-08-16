const { z } = require("zod");

const recordMigrationSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(1000).optional(),
    status: z.enum(["applied", "failed", "rolled_back"]).optional(),
  })
  .strict();

module.exports = { recordMigrationSchema };
