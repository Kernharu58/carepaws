const { z } = require("zod");

const createBackupSchema = z
  .object({
    type: z.enum(["manual", "automatic"]).optional(),
  })
  .strict();

module.exports = { createBackupSchema };
