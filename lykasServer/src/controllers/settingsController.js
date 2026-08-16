const Settings = require("../models/Settings");
const { asyncHandler } = require("../utils/AppError");
const { logAudit } = require("../utils/auditLogger");

/** There is exactly one Settings document — created on first read if it doesn't exist yet. */
async function getOrCreateSettings() {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
}

const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const previousValues = settings.toObject();

  Object.assign(settings, req.body);
  await settings.save();

  await logAudit({
    actor: req.user._id,
    action: "settings.update",
    previousValues,
    newValues: settings.toObject(),
    req,
  });

  res.status(200).json({ success: true, data: settings });
});

module.exports = { getSettings, updateSettings };
