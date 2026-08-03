const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/inKindDonationController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const schemas = require("../validators/inKindDonation.schema");

router.post("/", protect, validateRequest(schemas.createInKindDonationSchema), ctrl.createDonation);
router.get("/my", protect, ctrl.myDonations);
router.get("/", protect, adminOnly, ctrl.listDonations);
router.get("/export", protect, adminOnly, ctrl.exportDonations);
router.post("/bulk-status", protect, adminOnly, validateRequest(schemas.bulkStatusSchema), ctrl.bulkUpdateStatus);
router.patch("/:id/status", protect, adminOnly, validateRequest(schemas.updateStatusSchema), ctrl.updateStatus);
router.delete("/:id", protect, adminOnly, ctrl.deleteDonation);
router.post("/:id/restore", protect, adminOnly, ctrl.restoreDonation);
router.get("/:id/history", protect, adminOnly, ctrl.donationHistory);

module.exports = router;
