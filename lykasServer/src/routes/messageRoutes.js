const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:userId", protect, ctrl.conversationHistory);

module.exports = router;
