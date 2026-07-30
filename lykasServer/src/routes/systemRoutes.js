const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/systemController");

router.get("/health", ctrl.health);
router.get("/version", ctrl.version);

module.exports = router;
