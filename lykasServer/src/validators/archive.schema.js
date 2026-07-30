const { z } = require("zod");

const archiveRecordSchema = z
  .object({
    id: z.string().min(1),
    reason: z.string().max(500).optional(),
  })
  .strict();

module.exports = { archiveRecordSchema };
