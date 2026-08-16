const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/analyticsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/overview", protect, adminOnly, ctrl.overview);
router.get("/trends", protect, adminOnly, ctrl.trends);
router.get("/pets-breakdown", protect, adminOnly, ctrl.petsBreakdown);

module.exports = router;
