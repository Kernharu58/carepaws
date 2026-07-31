const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/homeVisitController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/homeVisit.schema");

router.get("/my", protect, ctrl.myHomeVisits);
router.post("/", protect, adminOnly, validateRequest(schemas.createHomeVisitSchema), ctrl.createHomeVisit);
router.get("/", protect, adminOnly, ctrl.listHomeVisits);
router.get("/:id", protect, adminOnly, ctrl.getHomeVisit);
router.put("/:id", protect, adminOnly, validateRequest(schemas.updateHomeVisitSchema), ctrl.updateHomeVisit);
router.put(
  "/:id/complete",
  protect,
  adminOnly,
  validateRequest(schemas.completeHomeVisitSchema),
  ctrl.completeHomeVisit
);
router.put("/:id/cancel", protect, adminOnly, validateRequest(schemas.cancelHomeVisitSchema), ctrl.cancelHomeVisit);
router.put("/:id/no-show", protect, adminOnly, ctrl.noShowHomeVisit);

module.exports = router;
