const { logger } = require("../utils/logger");

/**
 * §8.1 — one consistent { success, message, error? } envelope from every
 * endpoint, standardized here rather than left inconsistent per-controller
 * as in the source. Mongoose validation/cast errors and duplicate-key
 * errors are translated into sane 400/409s instead of leaking a 500 with
 * a raw driver error message.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `${field} already in use`;
  }

  const log = req.log || logger;
  if (statusCode >= 500) {
    log.error({ err, statusCode, path: req.path }, message);
  } else {
    log.warn({ statusCode, path: req.path }, message);
  }

  res.status(statusCode).json({
    success: false,
    message: err.isOperational || statusCode < 500 ? message : "Something went wrong",
    ...(req.id ? { requestId: req.id } : {}),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFoundHandler };
