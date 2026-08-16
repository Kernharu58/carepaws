const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/scheduledJobController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, adminOnly, ctrl.listJobs);
router.get("/:jobKey/history", protect, adminOnly, ctrl.jobHistory);
router.post("/:jobKey/run", protect, adminOnly, ctrl.runJobNow);

module.exports = router;
