const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/monitoringReportController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/monitoringReport.schema");

router.get("/my", protect, ctrl.myReports);
router.get("/flagged", protect, adminOnly, ctrl.flaggedReports);
router.get("/pet/:petId", protect, adminOnly, ctrl.reportsForPet);
router.post("/", protect, validateRequest(schemas.createMonitoringReportSchema), ctrl.createReport);
router.get("/", protect, adminOnly, ctrl.listReports);
router.get("/:id", protect, adminOnly, ctrl.getReport);
router.put("/:id/review", protect, adminOnly, validateRequest(schemas.reviewMonitoringReportSchema), ctrl.reviewReport);

module.exports = router;
