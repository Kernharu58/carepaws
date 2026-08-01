const { z } = require("zod");

const createVaccinationSchema = z
  .object({
    pet: z.string().min(1),
    vaccineName: z.string().trim().min(1).max(150),
    dateGiven: z.coerce.date(),
    nextDueDate: z.coerce.date().optional(),
    administeredBy: z.string().max(150).optional(),
    batchNumber: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateVaccinationSchema = createVaccinationSchema.omit({ pet: true }).partial();

const createVetVisitSchema = z
  .object({
    pet: z.string().min(1),
    visitDate: z.coerce.date(),
    reason: z.string().trim().min(1).max(300),
    vetName: z.string().max(150).optional(),
    clinic: z.string().max(150).optional(),
    diagnosis: z.string().max(1000).optional(),
    treatment: z.string().max(1000).optional(),
    prescription: z.string().max(1000).optional(),
    followUpDate: z.coerce.date().optional(),
    cost: z.coerce.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateVetVisitSchema = createVetVisitSchema.omit({ pet: true }).partial();

const createMedicalRecordEntrySchema = z
  .object({
    pet: z.string().min(1),
    type: z.enum([
      "Surgery",
      "Deworming",
      "Flea Treatment",
      "Dental",
      "Spay/Neuter",
      "Injury",
      "Illness",
      "Other",
    ]),
    date: z.coerce.date(),
    description: z.string().max(2000).optional(),
    performedBy: z.string().max(150).optional(),
    outcome: z.string().max(1000).optional(),
    followUpRequired: z.boolean().optional(),
    followUpDate: z.coerce.date().optional(),
    cost: z.coerce.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateMedicalRecordEntrySchema = createMedicalRecordEntrySchema.omit({ pet: true }).partial();

module.exports = {
  createVaccinationSchema,
  updateVaccinationSchema,
  createVetVisitSchema,
  updateVetVisitSchema,
  createMedicalRecordEntrySchema,
  updateMedicalRecordEntrySchema,
};
