const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/petController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly, superAdminOnly } = require("../middleware/authMiddleware");
const { uploader } = require("../middleware/uploadMiddleware");
const { createPetSchema, updatePetSchema, adoptPetSchema } = require("../validators/pet.schema");

// --- Public ---
router.get("/", ctrl.listPets);

// --- Admin (fixed paths must be declared before /:id so they don't get swallowed by it) ---
router.get("/admin", protect, adminOnly, ctrl.listPetsAdmin);
router.get("/export", protect, adminOnly, ctrl.exportPets);
router.get("/my-pets", protect, ctrl.myPets);

router.post(
  "/",
  protect,
  adminOnly,
  uploader("image").single("image"),
  validateRequest(createPetSchema),
  ctrl.createPet
);

router.get("/:id", ctrl.getPet);
router.put(
  "/:id",
  protect,
  adminOnly,
  uploader("image").single("image"),
  validateRequest(updatePetSchema),
  ctrl.updatePet
);
router.delete("/:id", protect, adminOnly, ctrl.deletePet);
router.post("/:id/adopt", protect, adminOnly, validateRequest(adoptPetSchema), ctrl.adoptPet);
router.post("/:id/restore", protect, adminOnly, ctrl.restorePet);
router.delete("/:id/permanent", protect, superAdminOnly, ctrl.permanentlyDeletePet);
router.get("/:id/history", protect, adminOnly, ctrl.petHistory);

module.exports = router;
