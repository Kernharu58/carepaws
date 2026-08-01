const { z } = require("zod");

const createEmergencyReportSchema = z
  .object({
    type: z.enum(["stray_animal", "injured_animal", "abuse_report", "abandoned_animal", "other"]),
    animalType: z.string().max(100).optional(),
    description: z.string().trim().min(1).max(2000),
    location: z.string().max(300).optional(),
    coordinates: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .optional(),
    contactName: z.string().max(150).optional(),
    contactPhone: z.string().max(30).optional(),
  })
  .strict();

const updateEmergencyReportSchema = z
  .object({
    status: z.enum(["open", "in_progress", "resolved", "dismissed"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    assignedTo: z.string().optional(),
    resolutionNote: z.string().max(1000).optional(),
    linkedPet: z.string().optional(),
  })
  .strict();

module.exports = { createEmergencyReportSchema, updateEmergencyReportSchema };
