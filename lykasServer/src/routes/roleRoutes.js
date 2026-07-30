const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/roleController");
const validateRequest = require("../middleware/validateRequest");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const { createRoleSchema, updateRoleSchema } = require("../validators/role.schema");

router.get("/", protect, superAdminOnly, ctrl.listRoles);
router.post("/", protect, superAdminOnly, validateRequest(createRoleSchema), ctrl.createRole);
router.put("/:id", protect, superAdminOnly, validateRequest(updateRoleSchema), ctrl.updateRole);
router.delete("/:id", protect, superAdminOnly, ctrl.deleteRole);

module.exports = router;
