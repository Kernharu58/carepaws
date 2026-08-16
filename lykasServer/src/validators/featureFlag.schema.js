const { z } = require("zod");

const createFeatureFlagSchema = z
  .object({
    key: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(150),
    description: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

const updateFeatureFlagSchema = z
  .object({
    label: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

module.exports = { createFeatureFlagSchema, updateFeatureFlagSchema };
