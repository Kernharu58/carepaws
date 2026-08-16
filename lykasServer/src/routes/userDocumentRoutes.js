const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/userDocumentController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { uploader } = require("../middleware/uploadMiddleware");
const { createUserDocumentSchema, verifyUserDocumentSchema } = require("../validators/userDocument.schema");

router.get("/my", protect, ctrl.myDocuments);
router.post(
  "/",
  protect,
  uploader("document").single("file"),
  validateRequest(createUserDocumentSchema),
  ctrl.uploadDocument
);
router.delete("/:id", protect, ctrl.deleteDocument);
router.get("/", protect, adminOnly, ctrl.listDocuments);
router.put("/:id/verify", protect, adminOnly, validateRequest(verifyUserDocumentSchema), ctrl.verifyDocument);

module.exports = router;
