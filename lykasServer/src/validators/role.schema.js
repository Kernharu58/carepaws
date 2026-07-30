const { z } = require("zod");

const createRoleSchema = z
  .object({
    key: z.string().trim().min(2).max(50),
    label: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    permissions: z.array(z.string()).default([]),
  })
  .strict();

const updateRoleSchema = z
  .object({
    label: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    permissions: z.array(z.string()).optional(),
  })
  .strict();

const createApiKeySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    scopes: z.array(z.string()).default([]),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

module.exports = { createRoleSchema, updateRoleSchema, createApiKeySchema };
