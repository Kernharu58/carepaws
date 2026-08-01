const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/babyBookController");
const validateRequest = require("../middleware/validateRequest");
const { protect } = require("../middleware/authMiddleware");
const { createBabyBookEntrySchema, updateBabyBookEntrySchema } = require("../validators/babyBook.schema");

router.get("/my", protect, ctrl.myEntries);
router.get("/entry/:id", protect, ctrl.getEntry);
router.post("/", protect, validateRequest(createBabyBookEntrySchema), ctrl.createEntry);
router.put("/entry/:id", protect, validateRequest(updateBabyBookEntrySchema), ctrl.updateEntry);
router.delete("/entry/:id", protect, ctrl.deleteEntry);
router.get("/:petId", protect, ctrl.entriesForPet);

module.exports = router;
