const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/eventController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/event.schema");

router.get("/my-registrations", protect, ctrl.myRegistrations);
router.post("/", protect, adminOnly, validateRequest(schemas.createEventSchema), ctrl.createEvent);
router.get("/", ctrl.listEvents);
router.get("/:id", ctrl.getEvent);
router.put("/:id", protect, adminOnly, validateRequest(schemas.updateEventSchema), ctrl.updateEvent);
router.delete("/:id", protect, adminOnly, ctrl.deleteEvent);

router.post("/:id/register", protect, ctrl.registerForEvent);
router.delete("/:id/register", protect, ctrl.unregisterFromEvent);
router.get("/:id/registrations", protect, adminOnly, ctrl.listRegistrations);
router.put(
  "/:id/registrations/:userId/attend",
  protect,
  adminOnly,
  validateRequest(schemas.attendRegistrationSchema),
  ctrl.markAttendance
);

router.post("/:id/volunteers", protect, adminOnly, validateRequest(schemas.assignVolunteerSchema), ctrl.assignVolunteer);
router.get("/:id/volunteers", protect, adminOnly, ctrl.listEventVolunteers);
router.put(
  "/:id/volunteers/:assignmentId",
  protect,
  adminOnly,
  validateRequest(schemas.updateAssignmentSchema),
  ctrl.updateEventVolunteerAssignment
);

module.exports = router;
