const { z } = require("zod");

const createFileAssetSchema = z
  .object({
    category: z.enum(["adoption_document", "id_document", "medical_record", "image", "other"]),
    relatedModel: z.string().max(100).optional(),
    relatedId: z.string().optional(),
  })
  .strict();

module.exports = { createFileAssetSchema };
