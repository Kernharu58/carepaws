const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/featureFlagController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createFeatureFlagSchema, updateFeatureFlagSchema } = require("../validators/featureFlag.schema");

router.get("/public", protect, ctrl.publicFlags);
router.get("/", protect, adminOnly, ctrl.listFlags);
router.post("/", protect, adminOnly, validateRequest(createFeatureFlagSchema), ctrl.createFlag);
router.put("/:key", protect, adminOnly, validateRequest(updateFeatureFlagSchema), ctrl.updateFlag);

module.exports = router;
