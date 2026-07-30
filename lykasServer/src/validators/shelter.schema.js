const { z } = require("zod");

const createShelterSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    address: z.string().trim().max(300).optional(),
    coordinates: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .optional(),
    contactPerson: z.string().trim().max(150).optional(),
    contactPhone: z.string().trim().max(30).optional(),
    contactEmail: z.string().trim().email().optional(),
    capacity: z.coerce.number().min(0).optional(),
    currentOccupancy: z.coerce.number().min(0).optional(),
    type: z.enum(["main_shelter", "foster_hub", "clinic", "satellite"]).optional(),
    status: z.enum(["active", "at_capacity", "under_maintenance", "inactive"]).optional(),
    operatingHours: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    manager: z.string().optional(),
  })
  .strict();

const updateShelterSchema = createShelterSchema.partial();

module.exports = { createShelterSchema, updateShelterSchema };
