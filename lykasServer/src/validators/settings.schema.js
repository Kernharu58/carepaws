const { z } = require("zod");

const updateSettingsSchema = z
  .object({
    address: z.string().max(300).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
  })
  .strict();

module.exports = { updateSettingsSchema };
