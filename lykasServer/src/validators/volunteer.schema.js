const { z } = require("zod");

const availabilityEnum = z.enum(["Weekday mornings", "Weekday afternoons", "Weekends", "Flexible"]);

const registerVolunteerSchema = z
  .object({
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(300).optional(),
    motivation: z.string().max(2000).optional(),
    availability: z.array(availabilityEnum).optional(),
    skills: z.array(z.string().max(100)).optional(),
    emergencyContact: z
      .object({
        name: z.string().max(150).optional(),
        phone: z.string().max(30).optional(),
        relationship: z.string().max(100).optional(),
      })
      .optional(),
  })
  .strict();

const updateOwnVolunteerSchema = registerVolunteerSchema;

const updateVolunteerStatusSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "inactive"]),
  })
  .strict();

const logHoursSchema = z
  .object({
    hours: z.coerce.number().positive().max(24),
    note: z.string().max(500).optional(),
  })
  .strict();

const bulkStatusSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(["pending", "approved", "rejected", "inactive"]),
  })
  .strict();

module.exports = {
  registerVolunteerSchema,
  updateOwnVolunteerSchema,
  updateVolunteerStatusSchema,
  logHoursSchema,
  bulkStatusSchema,
};
