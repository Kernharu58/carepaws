const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/adopterProfileController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, adminOnly, ctrl.listAdopterProfiles);
router.get("/:userId", protect, adminOnly, ctrl.getAdopterProfile);

module.exports = router;
