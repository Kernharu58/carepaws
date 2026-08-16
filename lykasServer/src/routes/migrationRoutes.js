const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/migrationController");
const validateRequest = require("../middleware/validateRequest");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const { recordMigrationSchema } = require("../validators/migration.schema");

router.get("/", protect, superAdminOnly, ctrl.listMigrations);
router.post("/", protect, superAdminOnly, validateRequest(recordMigrationSchema), ctrl.recordMigration);

module.exports = router;
