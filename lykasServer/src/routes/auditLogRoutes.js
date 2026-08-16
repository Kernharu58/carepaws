const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/auditLogController");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");

router.use(protect, superAdminOnly);

router.get("/actions", ctrl.listActions);
router.get("/", ctrl.listAuditLogs);
router.get("/:id", ctrl.getAuditLog);

module.exports = router;
