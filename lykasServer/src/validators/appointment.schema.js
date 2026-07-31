const { z } = require("zod");

const createAppointmentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    date: z.coerce.date(),
    durationHours: z.coerce.number().min(0.25).max(24).optional(),
    capacity: z.coerce.number().int().min(1).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateAppointmentSchema = createAppointmentSchema.partial();

const enrollAppointmentSchema = z
  .object({
    phone: z.string().trim().max(30).optional(),
    emergencyContact: z.string().trim().max(200).optional(),
  })
  .strict();

module.exports = { createAppointmentSchema, updateAppointmentSchema, enrollAppointmentSchema };
