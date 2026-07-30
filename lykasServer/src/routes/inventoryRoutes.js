const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/inventoryController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/inventory.schema");

router.use(protect, adminOnly); // inventory is a staff-only operational tool

router.get("/summary", ctrl.summary);
router.get("/", ctrl.listInventory);
router.get("/:id", ctrl.getInventoryItem);
router.post("/", validateRequest(schemas.createInventoryItemSchema), ctrl.createInventoryItem);
router.put("/:id", validateRequest(schemas.updateInventoryItemSchema), ctrl.updateInventoryItem);
router.post("/:id/adjust", validateRequest(schemas.adjustInventorySchema), ctrl.adjustInventoryItem);
router.delete("/:id", ctrl.deleteInventoryItem);

module.exports = router;
