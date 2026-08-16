const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/reportsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/adoptions", protect, adminOnly, ctrl.adoptionsReport);
router.get("/financial", protect, adminOnly, ctrl.financialReport);
router.get("/volunteers", protect, adminOnly, ctrl.volunteersReport);
router.get("/welfare", protect, adminOnly, ctrl.welfareReport);

module.exports = router;
