const EmailTemplate = require("../models/EmailTemplate");
const { AppError, asyncHandler } = require("../utils/AppError");

const listTemplates = asyncHandler(async (req, res) => {
  const templates = await EmailTemplate.find().sort("label");
  res.status(200).json({ success: true, data: templates });
});

const getTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ key: req.params.key });
  if (!template) throw new AppError("Email template not found", 404);
  res.status(200).json({ success: true, data: template });
});

/** Upsert by key — lets an admin create the first version of a template as easily as editing one. */
const updateTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOneAndUpdate(
    { key: req.params.key },
    { ...req.body, key: req.params.key, updatedBy: req.user._id },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: template });
});

function substituteVariables(text, variables = {}) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in variables ? variables[key] : match));
}

const previewTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ key: req.params.key });
  if (!template) throw new AppError("Email template not found", 404);

  const variables = req.body.variables || {};
  res.status(200).json({
    success: true,
    data: {
      subject: substituteVariables(template.subject, variables),
      bodyHtml: substituteVariables(template.bodyHtml, variables),
    },
  });
});

module.exports = { listTemplates, getTemplate, updateTemplate, previewTemplate, substituteVariables };
