const FeatureFlag = require("../models/FeatureFlag");
const { AppError, asyncHandler } = require("../utils/AppError");
const { logAudit } = require("../utils/auditLogger");

/** GET /public — only key + enabled, safe to expose to any authenticated client for feature-gating UI. */
const publicFlags = asyncHandler(async (req, res) => {
  const flags = await FeatureFlag.find().select("key enabled -_id");
  res.status(200).json({ success: true, data: flags });
});

const listFlags = asyncHandler(async (req, res) => {
  const flags = await FeatureFlag.find().sort("key").populate("updatedBy", "displayName");
  res.status(200).json({ success: true, data: flags });
});

const createFlag = asyncHandler(async (req, res) => {
  const existing = await FeatureFlag.findOne({ key: req.body.key });
  if (existing) throw new AppError("A feature flag with this key already exists", 400);

  const flag = await FeatureFlag.create({ ...req.body, updatedBy: req.user._id });
  res.status(201).json({ success: true, data: flag });
});

const updateFlag = asyncHandler(async (req, res) => {
  const flag = await FeatureFlag.findOne({ key: req.params.key });
  if (!flag) throw new AppError("Feature flag not found", 404);

  const previousValues = { enabled: flag.enabled };
  Object.assign(flag, req.body, { updatedBy: req.user._id });
  await flag.save();

  await logAudit({
    actor: req.user._id,
    action: "feature_flag.update",
    metadata: { key: flag.key },
    previousValues,
    newValues: { enabled: flag.enabled },
    req,
  });

  res.status(200).json({ success: true, data: flag });
});

module.exports = { publicFlags, listFlags, createFlag, updateFlag };
