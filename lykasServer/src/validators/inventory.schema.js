const { z } = require("zod");

const createInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    category: z.enum(["food", "medical", "bedding", "cleaning", "equipment", "office", "other"]),
    quantity: z.coerce.number().min(0).optional(),
    unit: z.string().max(30).optional(),
    minThreshold: z.coerce.number().min(0).optional(),
    location: z.string().max(150).optional(),
    supplier: z.string().max(150).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

const updateInventoryItemSchema = createInventoryItemSchema.partial();

const adjustInventorySchema = z
  .object({
    type: z.enum(["restock", "usage", "adjustment"]),
    quantity: z.number().refine((v) => v !== 0, "quantity must be non-zero"),
    note: z.string().max(500).optional(),
  })
  .strict();

module.exports = { createInventoryItemSchema, updateInventoryItemSchema, adjustInventorySchema };
