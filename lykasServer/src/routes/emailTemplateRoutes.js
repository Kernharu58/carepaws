const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/emailTemplateController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { updateEmailTemplateSchema, previewEmailTemplateSchema } = require("../validators/emailTemplate.schema");

router.use(protect, adminOnly); // template management is a staff/admin tool

router.get("/", ctrl.listTemplates);
router.get("/:key", ctrl.getTemplate);
router.put("/:key", validateRequest(updateEmailTemplateSchema), ctrl.updateTemplate);
router.post("/:key/preview", validateRequest(previewEmailTemplateSchema), ctrl.previewTemplate);

module.exports = router;
