const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/apiKeyController");
const validateRequest = require("../middleware/validateRequest");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const { createApiKeySchema } = require("../validators/role.schema");

router.get("/", protect, superAdminOnly, ctrl.listApiKeys);
router.post("/", protect, superAdminOnly, validateRequest(createApiKeySchema), ctrl.createApiKey);
router.delete("/:id", protect, superAdminOnly, ctrl.revokeApiKey);

module.exports = router;
