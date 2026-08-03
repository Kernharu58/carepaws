const { z } = require("zod");

const updateEmailTemplateSchema = z
  .object({
    label: z.string().trim().min(1).max(150).optional(),
    subject: z.string().trim().min(1).max(300).optional(),
    bodyHtml: z.string().min(1).optional(),
    variables: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const previewEmailTemplateSchema = z
  .object({
    variables: z.record(z.string(), z.string()).optional(),
  })
  .strict();

module.exports = { updateEmailTemplateSchema, previewEmailTemplateSchema };
