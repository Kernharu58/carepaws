const { z } = require("zod");

const createEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(3000).optional(),
    category: z.enum(["Adoption Drive", "Fundraiser", "Training", "Community", "Volunteer", "Other"]).optional(),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    location: z.string().max(300).optional(),
    isOnline: z.boolean().optional(),
    onlineLink: z.string().url().optional(),
    maxAttendees: z.coerce.number().int().min(1).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).optional(),
});

const attendRegistrationSchema = z
  .object({
    status: z.enum(["registered", "attended", "cancelled"]),
  })
  .strict();

const assignVolunteerSchema = z
  .object({
    volunteer: z.string().min(1),
    role: z.string().max(150).optional(),
  })
  .strict();

const updateAssignmentSchema = z
  .object({
    status: z.enum(["assigned", "confirmed", "completed", "cancelled"]).optional(),
    role: z.string().max(150).optional(),
    hoursLogged: z.coerce.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

module.exports = {
  createEventSchema,
  updateEventSchema,
  attendRegistrationSchema,
  assignVolunteerSchema,
  updateAssignmentSchema,
};
