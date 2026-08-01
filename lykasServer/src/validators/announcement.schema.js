const { z } = require("zod");

const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(2000),
    level: z.enum(["info", "warning", "critical"]).optional(),
    audience: z.enum(["all", "admin", "user"]).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateAnnouncementSchema = createAnnouncementSchema.partial();

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };
