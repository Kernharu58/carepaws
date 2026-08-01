const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/fosterController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/foster.schema");

router.get("/reports/pending-review", protect, adminOnly, ctrl.pendingReviewReports);
router.put(
  "/reports/:reportId/review",
  protect,
  adminOnly,
  validateRequest(schemas.reviewFosterReportSchema),
  ctrl.reviewReport
);

router.get("/my", protect, ctrl.myFosters);
router.post("/", protect, adminOnly, validateRequest(schemas.createFosterSchema), ctrl.createFoster);
router.get("/", protect, adminOnly, ctrl.listFosters);

router.get("/:id", protect, ctrl.getFoster); // owner (fosterer) or staff
router.put("/:id", protect, adminOnly, validateRequest(schemas.updateFosterSchema), ctrl.updateFoster);
router.put("/:id/end", protect, adminOnly, validateRequest(schemas.endFosterSchema), ctrl.endFoster);
router.put("/:id/cancel", protect, adminOnly, validateRequest(schemas.cancelFosterSchema), ctrl.cancelFoster);
router.get("/:id/can-finalize", protect, adminOnly, ctrl.canFinalize);

router.post(
  "/:fosterId/reports",
  protect,
  validateRequest(schemas.createFosterReportSchema),
  ctrl.createFosterReport
);
router.get("/:fosterId/reports", protect, ctrl.listFosterReports);
router.get("/:fosterId/reports/missing", protect, adminOnly, ctrl.missingFosterReports);

module.exports = router;
