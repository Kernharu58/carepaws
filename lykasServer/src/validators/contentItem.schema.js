const { z } = require("zod");

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createContentItemSchema = z
  .object({
    type: z.enum(["faq", "policy", "page", "announcement"]),
    title: z.string().trim().min(1).max(200),
    body: z.string().max(20000).optional(),
    category: z.string().max(100).optional(),
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
    slug: z.string().regex(slugPattern, "slug must be lowercase, alphanumeric, hyphen-separated").optional(),
  })
  .strict();

const updateContentItemSchema = createContentItemSchema.partial();

module.exports = { createContentItemSchema, updateContentItemSchema };
