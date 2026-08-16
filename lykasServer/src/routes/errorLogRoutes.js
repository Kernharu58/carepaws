const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/errorLogController");
const validateRequest = require("../middleware/validateRequest");
const { optionalAuth, protect, adminOnly } = require("../middleware/authMiddleware");
const { reportErrorSchema } = require("../validators/errorLog.schema");

router.post("/report", optionalAuth, validateRequest(reportErrorSchema), ctrl.reportError);
router.get("/", protect, adminOnly, ctrl.listErrors);
router.put("/:id/resolve", protect, adminOnly, ctrl.resolveError);

module.exports = router;
