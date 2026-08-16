const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/fileAssetController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { uploader } = require("../middleware/uploadMiddleware");
const { createFileAssetSchema } = require("../validators/fileAsset.schema");

router.get("/", protect, adminOnly, ctrl.listFiles);
router.get("/storage-stats", protect, adminOnly, ctrl.storageStats);
router.post(
  "/",
  protect,
  uploader("document").single("file"),
  validateRequest(createFileAssetSchema),
  ctrl.uploadFile
);
router.delete("/:id", protect, adminOnly, ctrl.deleteFile);

module.exports = router;
