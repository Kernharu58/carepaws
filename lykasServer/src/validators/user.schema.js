const { z } = require("zod");

const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(300).optional(),
    notificationsEnabled: z.boolean().optional(),
  })
  .strict();

const updateRoleSchema = z
  .object({
    role: z.enum(["user", "staff", "admin", "super_admin"]),
  })
  .strict();

const updateStatusSchema = z
  .object({
    status: z.enum(["active", "suspended", "locked"]),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

const updateVerificationSchema = z
  .object({
    identityVerificationStatus: z.enum(["unverified", "pending", "verified", "rejected"]),
    identityVerificationNotes: z.string().trim().max(1000).optional(),
  })
  .strict();

const pushTokenSchema = z
  .object({
    pushToken: z.string().min(10),
  })
  .strict();

module.exports = {
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
  updateVerificationSchema,
  pushTokenSchema,
};
