const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/backupController");
const validateRequest = require("../middleware/validateRequest");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const { createBackupSchema } = require("../validators/backup.schema");

router.use(protect, superAdminOnly);

router.get("/", ctrl.listBackups);
router.post("/", validateRequest(createBackupSchema), ctrl.createBackup);
router.get("/:id/download", ctrl.downloadBackup);
router.post("/:id/restore", ctrl.restoreBackup);
router.delete("/:id", ctrl.deleteBackup);

module.exports = router;
