const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/feedbackController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createFeedbackSchema, updateFeedbackSchema } = require("../validators/feedback.schema");

router.get("/public", ctrl.publicFeedback);
router.get("/my", protect, ctrl.myFeedback);
router.post("/", protect, validateRequest(createFeedbackSchema), ctrl.createFeedback);
router.get("/", protect, adminOnly, ctrl.listFeedback);
router.get("/:id", protect, adminOnly, ctrl.getFeedback);
router.put("/:id", protect, adminOnly, validateRequest(updateFeedbackSchema), ctrl.updateFeedback);
router.delete("/:id", protect, adminOnly, ctrl.deleteFeedback);

module.exports = router;
