const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/interviewController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/interview.schema");

router.get("/my", protect, ctrl.myInterviews);
router.post("/", protect, adminOnly, validateRequest(schemas.createInterviewSchema), ctrl.createInterview);
router.get("/", protect, adminOnly, ctrl.listInterviews);
router.get("/:id", protect, adminOnly, ctrl.getInterview);
router.put("/:id", protect, adminOnly, validateRequest(schemas.updateInterviewSchema), ctrl.updateInterview);
router.put(
  "/:id/complete",
  protect,
  adminOnly,
  validateRequest(schemas.completeInterviewSchema),
  ctrl.completeInterview
);
router.put("/:id/cancel", protect, adminOnly, validateRequest(schemas.cancelInterviewSchema), ctrl.cancelInterview);
router.put("/:id/no-show", protect, adminOnly, ctrl.noShowInterview);

module.exports = router;
