const { z } = require("zod");

const reportErrorSchema = z
  .object({
    source: z.enum(["server", "admin", "mobile"]).optional(),
    message: z.string().trim().min(1).max(2000),
    stack: z.string().max(10000).optional(),
    route: z.string().max(300).optional(),
    severity: z.enum(["info", "warning", "error", "fatal"]).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

module.exports = { reportErrorSchema };
