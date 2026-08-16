const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/dashboardController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, adminOnly, ctrl.dashboard);

module.exports = router;
