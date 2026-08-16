const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/settingsController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { updateSettingsSchema } = require("../validators/settings.schema");

router.get("/", protect, adminOnly, ctrl.getSettings);
router.put("/", protect, adminOnly, validateRequest(updateSettingsSchema), ctrl.updateSettings);

module.exports = router;
