const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/emergencyReportController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/emergencyReport.schema");

router.get("/my", protect, ctrl.myReports);
router.post("/", protect, validateRequest(schemas.createEmergencyReportSchema), ctrl.createReport);
router.get("/", protect, adminOnly, ctrl.listReports);
router.get("/:id", protect, adminOnly, ctrl.getReport);
router.put("/:id", protect, adminOnly, validateRequest(schemas.updateEmergencyReportSchema), ctrl.updateReport);

module.exports = router;
