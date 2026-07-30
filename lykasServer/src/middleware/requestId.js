const crypto = require("crypto");
const { childLogger } = require("../utils/logger");

/**
 * §11.5 — generates a correlation id per request (or reuses one the client
 * sent), echoes it back in the response headers, and attaches a child
 * logger so every log line for this request — and any ErrorLog record
 * created during it — carries the same id.
 */
function requestId(req, res, next) {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  req.log = childLogger(req.id);
  next();
}

module.exports = requestId;
