const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/riskAssessmentController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/riskAssessment.schema");

router.use(protect, adminOnly); // risk assessments are staff-only, front to back

router.get("/application/:applicationId", ctrl.byApplication);
router.post("/", validateRequest(schemas.createRiskAssessmentSchema), ctrl.createRiskAssessment);
router.get("/", ctrl.listRiskAssessments);
router.get("/:id", ctrl.getRiskAssessment);
router.put("/:id", validateRequest(schemas.updateRiskAssessmentSchema), ctrl.updateRiskAssessment);

module.exports = router;
