const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/eventAssignmentController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { assignVolunteerSchema, updateAssignmentSchema } = require("../validators/event.schema");
const { z } = require("zod");

const createStandaloneAssignmentSchema = assignVolunteerSchema.extend({ event: z.string().min(1) });

router.get("/my", protect, ctrl.myAssignments);
router.post("/", protect, adminOnly, validateRequest(createStandaloneAssignmentSchema), ctrl.createAssignment);
router.get("/", protect, adminOnly, ctrl.listAssignments);
router.put("/:id", protect, adminOnly, validateRequest(updateAssignmentSchema), ctrl.updateAssignment);
router.put("/:id/confirm", protect, ctrl.confirmAssignment); // volunteer confirms their own, or staff
router.delete("/:id", protect, adminOnly, ctrl.deleteAssignment);

module.exports = router;
