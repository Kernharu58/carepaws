const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/noteController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { addNoteSchema } = require("../validators/notification.schema");

router.use(protect, adminOnly); // internal staff notes, front to back

router.get("/:entityType/:entityId", ctrl.listNotes);
router.post("/:entityType/:entityId", validateRequest(addNoteSchema), ctrl.addNote);
router.delete("/:id", ctrl.deleteNote);

module.exports = router;
