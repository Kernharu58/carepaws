const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/volunteerController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/volunteer.schema");

router.post("/register", protect, validateRequest(schemas.registerVolunteerSchema), ctrl.registerVolunteer);
router.get("/me", protect, ctrl.getMyVolunteerProfile);
router.put("/me", protect, validateRequest(schemas.updateOwnVolunteerSchema), ctrl.updateMyVolunteerProfile);

router.get("/", protect, adminOnly, ctrl.listVolunteers);
router.get("/export", protect, adminOnly, ctrl.exportVolunteers);
router.post("/bulk-status", protect, adminOnly, validateRequest(schemas.bulkStatusSchema), ctrl.bulkUpdateStatus);

router.get("/:id", protect, adminOnly, ctrl.getVolunteer);
router.put(
  "/:id/status",
  protect,
  adminOnly,
  validateRequest(schemas.updateVolunteerStatusSchema),
  ctrl.updateVolunteerStatus
);
router.post("/:id/hours", protect, adminOnly, validateRequest(schemas.logHoursSchema), ctrl.logHours);
router.delete("/:id", protect, adminOnly, ctrl.deleteVolunteer);
router.post("/:id/restore", protect, adminOnly, ctrl.restoreVolunteer);
router.get("/:id/history", protect, adminOnly, ctrl.volunteerHistory);

module.exports = router;
