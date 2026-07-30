const { z } = require("zod");

const speciesEnum = z.enum(["Dog", "Cat", "Other"]);
const genderEnum = z.enum(["Male", "Female"]);
const sizeEnum = z.enum(["Small", "Medium", "Large"]);
const temperamentEnum = z.enum([
  "Calm",
  "Playful",
  "Shy",
  "Energetic",
  "Affectionate",
  "Independent",
]);
const energyLevelEnum = z.enum(["Low", "Medium", "High"]);
const statusEnum = z.enum(["Available", "Pending", "Adopted", "Foster"]);

const createPetSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    species: speciesEnum,
    breed: z.string().trim().max(100).optional(),
    age: z.coerce.number().min(0).max(40).optional(),
    gender: genderEnum,
    size: sizeEnum.optional(),
    weight: z.coerce.number().min(0).optional(),
    temperament: temperamentEnum.optional(),
    energyLevel: energyLevelEnum.optional(),
    healthStatus: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
    status: statusEnum.optional(),
  })
  .strict();

// Multipart requests carry the image as a file, not a JSON field — everything
// else validates the same as create, all optional for a partial update.
const updatePetSchema = createPetSchema.partial();

const adoptPetSchema = z
  .object({
    userId: z.string().min(1, "userId is required"),
  })
  .strict();

module.exports = { createPetSchema, updatePetSchema, adoptPetSchema };
