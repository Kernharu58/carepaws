const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const { AppError, asyncHandler } = require("../utils/AppError");
const { hashKey } = require("../middleware/apiKeyAuth");
const { logAudit } = require("../utils/auditLogger");

const listApiKeys = asyncHandler(async (req, res) => {
  const keys = await ApiKey.find().sort("-createdAt").populate("createdBy", "displayName email");
  res.status(200).json({ success: true, data: keys });
});

const createApiKey = asyncHandler(async (req, res) => {
  const raw = `cpk_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);

  const apiKey = await ApiKey.create({
    name: req.body.name,
    keyHash: hashKey(raw),
    prefix,
    scopes: req.body.scopes,
    createdBy: req.user._id,
    expiresAt: req.body.expiresAt,
  });

  await logAudit({ actor: req.user._id, action: "apikey.create", metadata: { name: apiKey.name }, req });

  // The raw key is only ever visible in this one response — it can't be recovered later.
  res.status(201).json({ success: true, data: { ...apiKey.toObject(), keyHash: undefined, key: raw } });
});

const revokeApiKey = asyncHandler(async (req, res) => {
  const apiKey = await ApiKey.findById(req.params.id);
  if (!apiKey) throw new AppError("API key not found", 404);

  apiKey.revoked = true;
  apiKey.revokedAt = new Date();
  await apiKey.save();

  await logAudit({ actor: req.user._id, action: "apikey.revoke", metadata: { name: apiKey.name }, req });

  res.status(200).json({ success: true, message: "API key revoked" });
});

module.exports = { listApiKeys, createApiKey, revokeApiKey };
