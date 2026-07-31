const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/applicationController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/application.schema");

router.get("/my", protect, ctrl.myApplications);

// Addition beyond §5.3's literal route table — see the comment on
// createApplication in the controller for why this is necessary.
router.post("/", protect, validateRequest(schemas.createApplicationSchema), ctrl.createApplication);

router.get("/", protect, adminOnly, ctrl.listApplications);
router.get("/export", protect, adminOnly, ctrl.exportApplications);
router.post("/bulk-status", protect, adminOnly, validateRequest(schemas.bulkStatusSchema), ctrl.bulkUpdateStatus);

router.get("/:id", protect, ctrl.getApplication); // owner or staff — enforced in the controller
router.delete("/:id", protect, adminOnly, ctrl.deleteApplication);
router.put("/:id/status", protect, adminOnly, validateRequest(schemas.updateStatusSchema), ctrl.updateStatus);
router.put("/:id/stage", protect, adminOnly, validateRequest(schemas.updateStageSchema), ctrl.updateStage);
router.get("/:id/history", protect, adminOnly, ctrl.applicationHistory);
router.get("/:id/notes", protect, adminOnly, ctrl.getNotes);
router.post("/:id/notes", protect, adminOnly, validateRequest(schemas.addNoteSchema), ctrl.addNote);
router.get("/:id/vetting-status", protect, adminOnly, ctrl.vettingStatus);

module.exports = router;
