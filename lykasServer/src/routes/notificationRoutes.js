const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/notificationController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { sendNotificationSchema } = require("../validators/notification.schema");

router.get("/unread-count", protect, ctrl.unreadCount);
router.get("/my", protect, ctrl.myNotifications);
router.put("/read-all", protect, ctrl.markAllRead);
router.delete("/", protect, ctrl.deleteAll);
router.put("/:id/read", protect, ctrl.markRead);
router.delete("/:id", protect, ctrl.deleteOne);

// --- Admin ---
router.get("/admin", protect, adminOnly, ctrl.adminList);
router.post("/send", protect, adminOnly, validateRequest(sendNotificationSchema), ctrl.sendNotification);
router.get("/", protect, adminOnly, ctrl.adminList);

module.exports = router;
