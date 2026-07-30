const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/shelterController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createShelterSchema, updateShelterSchema } = require("../validators/shelter.schema");

router.get("/summary", protect, adminOnly, ctrl.summary);
router.get("/", protect, adminOnly, ctrl.listShelters);
router.get("/:id", protect, adminOnly, ctrl.getShelter);
router.post("/", protect, adminOnly, validateRequest(createShelterSchema), ctrl.createShelter);
router.put("/:id", protect, adminOnly, validateRequest(updateShelterSchema), ctrl.updateShelter);
router.delete("/:id", protect, adminOnly, ctrl.deleteShelter);

module.exports = router;
