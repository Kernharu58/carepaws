const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/appointmentController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/appointment.schema");

// NOTE: §9 explicitly flags GET /appointments/seed as a dev/test helper to
// exclude from the production build entirely — it is deliberately not
// implemented here.

router.get("/", protect, ctrl.listAppointments);
router.post("/", protect, adminOnly, validateRequest(schemas.createAppointmentSchema), ctrl.createAppointment);
router.get("/my-appointments", protect, ctrl.myAppointments);
router.post("/:id/enroll", protect, validateRequest(schemas.enrollAppointmentSchema), ctrl.enrollAppointment);
router.post("/:id/cancel", protect, ctrl.cancelAppointment);
router.put("/:id", protect, adminOnly, validateRequest(schemas.updateAppointmentSchema), ctrl.updateAppointment);
router.delete("/:id", protect, adminOnly, ctrl.deleteAppointment);

module.exports = router;
