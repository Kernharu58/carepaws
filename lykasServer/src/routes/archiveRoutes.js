const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/archiveController");
const validateRequest = require("../middleware/validateRequest");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const { archiveRecordSchema } = require("../validators/archive.schema");

router.use(protect, superAdminOnly); // archiving/restoring whole records is a super-admin action

router.get("/", ctrl.listArchive);
router.post("/:collection", validateRequest(archiveRecordSchema), ctrl.archiveRecord);
router.post("/:id/restore", ctrl.restoreArchivedRecord);

module.exports = router;
