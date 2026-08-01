const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/announcementController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createAnnouncementSchema, updateAnnouncementSchema } = require("../validators/announcement.schema");

router.get("/active", ctrl.activeAnnouncements);
router.get("/", protect, adminOnly, ctrl.listAnnouncements);
router.post("/", protect, adminOnly, validateRequest(createAnnouncementSchema), ctrl.createAnnouncement);
router.put("/:id", protect, adminOnly, validateRequest(updateAnnouncementSchema), ctrl.updateAnnouncement);
router.delete("/:id", protect, adminOnly, ctrl.deleteAnnouncement);

module.exports = router;
