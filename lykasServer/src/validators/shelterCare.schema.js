const { z } = require("zod");

const objectId = z.string().min(1);

const healthCheckSchema = z
  .object({
    pet: objectId,
    date: z.coerce.date().optional(),
    weight: z.coerce.number().min(0).optional(),
    temperature: z.coerce.number().optional(),
    condition: z.enum(["Excellent", "Good", "Fair", "Poor", "Critical"]),
    notes: z.string().max(1000).optional(),
    flagged: z.boolean().optional(),
  })
  .strict();

const feedingLogSchema = z
  .object({
    pet: objectId,
    date: z.coerce.date().optional(),
    meal: z.enum(["Morning", "Afternoon", "Evening"]),
    foodType: z.string().max(200).optional(),
    amount: z.string().max(100).optional(),
    eaten: z.enum(["All", "Most", "Half", "Little", "None"]).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const behavioralObservationSchema = z
  .object({
    pet: objectId,
    date: z.coerce.date().optional(),
    mood: z.enum(["Happy", "Calm", "Anxious", "Aggressive", "Lethargic", "Playful"]).optional(),
    sociability: z.enum(["Friendly", "Neutral", "Shy", "Aggressive"]).optional(),
    notes: z.string().max(1000).optional(),
    flagged: z.boolean().optional(),
  })
  .strict();

const cageAssignmentSchema = z
  .object({
    pet: objectId,
    cageNumber: z.string().min(1).max(50),
    section: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

const quarantineSchema = z
  .object({
    pet: objectId,
    startDate: z.coerce.date().optional(),
    reason: z.string().min(1).max(500),
    notes: z.string().max(1000).optional(),
  })
  .strict();

module.exports = {
  healthCheckSchema,
  feedingLogSchema,
  behavioralObservationSchema,
  cageAssignmentSchema,
  quarantineSchema,
};
