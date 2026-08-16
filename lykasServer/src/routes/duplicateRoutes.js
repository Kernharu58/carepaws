const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/duplicateController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/users", protect, adminOnly, ctrl.duplicateUsers);
router.get("/pets", protect, adminOnly, ctrl.duplicatePets);

module.exports = router;
