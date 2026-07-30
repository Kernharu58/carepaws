const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/apiMonitoringController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/summary", protect, adminOnly, ctrl.summary);

module.exports = router;
