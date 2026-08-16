const Migration = require("../models/Migration");
const { AppError, asyncHandler } = require("../utils/AppError");

const listMigrations = asyncHandler(async (req, res) => {
  const migrations = await Migration.find().sort("-appliedAt").populate("appliedBy", "displayName");
  res.status(200).json({ success: true, data: migrations });
});

/**
 * §5.2 lists Migration as a log/record model, not an execution engine —
 * actually running migration scripts belongs in a CLI/CI step (e.g.
 * `npm run migrate`) that writes its result here afterward, never in an
 * HTTP handler that would otherwise let an admin trigger arbitrary code
 * execution on the server via the API. This endpoint records that a named
 * migration was applied; it does not run one.
 */
const recordMigration = asyncHandler(async (req, res) => {
  const existing = await Migration.findOne({ name: req.body.name });
  if (existing) throw new AppError("A migration with this name has already been recorded", 400);

  const migration = await Migration.create({ ...req.body, appliedBy: req.user._id, appliedAt: new Date() });
  res.status(201).json({ success: true, data: migration });
});

module.exports = { listMigrations, recordMigration };
