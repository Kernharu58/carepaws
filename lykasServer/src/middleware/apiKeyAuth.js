const crypto = require("crypto");
const { AppError, asyncHandler } = require("../utils/AppError");
const ApiKey = require("../models/ApiKey");

function hashKey(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Alternative auth path for external/service-to-service consumers (§5.1). */
const apiKeyAuth = asyncHandler(async (req, res, next) => {
  const raw = req.headers["x-api-key"];
  if (!raw) throw new AppError("Missing API key", 401);

  const keyHash = hashKey(raw);
  const apiKey = await ApiKey.findOne({ keyHash }).select("+keyHash");

  if (!apiKey || apiKey.revoked) throw new AppError("Invalid API key", 401);
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new AppError("API key has expired", 401);
  }

  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  req.apiKey = apiKey;
  next();
});

module.exports = { apiKeyAuth, hashKey };
