const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/shelterCareController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/shelterCare.schema");

router.use(protect, adminOnly); // the whole shelter-floor care log is staff-only

router.get("/summary/:petId", ctrl.petCareSummary);

router.post("/health-checks", validateRequest(schemas.healthCheckSchema), ctrl.createHealthCheck);
router.get("/health-checks/flagged", ctrl.flaggedHealthChecks);
router.get("/health-checks/:petId", ctrl.petHealthChecks);

router.post("/feeding-logs", validateRequest(schemas.feedingLogSchema), ctrl.createFeedingLog);
router.get("/feeding-logs/:petId", ctrl.petFeedingLogs);

router.post(
  "/behavioral-obs",
  validateRequest(schemas.behavioralObservationSchema),
  ctrl.createBehavioralObservation
);
router.get("/behavioral-obs/:petId", ctrl.petBehavioralObservations);

router.post("/cages", validateRequest(schemas.cageAssignmentSchema), ctrl.createCageAssignment);
router.get("/cages", ctrl.listCageAssignments);
router.get("/cages/:petId", ctrl.petCageAssignments);
router.delete("/cages/:assignmentId", ctrl.releaseCageAssignment);

router.post("/quarantine", validateRequest(schemas.quarantineSchema), ctrl.startQuarantine);
router.get("/quarantine", ctrl.listQuarantine);
router.get("/quarantine/:petId", ctrl.petQuarantine);
router.put("/quarantine/:id/end", ctrl.endQuarantine);

module.exports = router;
