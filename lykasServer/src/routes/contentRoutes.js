const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/contentItemController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createContentItemSchema, updateContentItemSchema } = require("../validators/contentItem.schema");

router.get("/public", ctrl.publicContent);
router.get("/public/slug/:slug", ctrl.publicContentBySlug);

router.get("/", protect, adminOnly, ctrl.listContent);
router.get("/:id", protect, adminOnly, ctrl.getContentItem);
router.post("/", protect, adminOnly, validateRequest(createContentItemSchema), ctrl.createContentItem);
router.put("/:id", protect, adminOnly, validateRequest(updateContentItemSchema), ctrl.updateContentItem);
router.delete("/:id", protect, adminOnly, ctrl.deleteContentItem);

module.exports = router;
