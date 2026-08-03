const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/messageController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, adminOnly, ctrl.chatSessions);

module.exports = router;
