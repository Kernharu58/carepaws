const { logger } = require("../utils/logger");

/**
 * §8.1 — one consistent { success, message, error? } envelope from every
 * endpoint, standardized here rather than left inconsistent per-controller
 * as in the source. Mongoose validation/cast errors and duplicate-key
 * errors are translated into sane 400/409s instead of leaking a 500 with
 * a raw driver error message.
 *
 * §11.5 — 500-level errors are also persisted to ErrorLog (System & Admin
 * Ops domain), so shelter staff with no Sentry seat can review them from
 * the admin panel; this is in addition to, not instead of, the pino log
 * line. Required lazily to avoid a load-order dependency between
 * middleware/ and models/ at module-init time.
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

    try {
      const ErrorLog = require("../models/ErrorLog");
      ErrorLog.create({
        source: "server",
        message: err.message || message,
        stack: err.stack,
        route: req.path,
        method: req.method,
        statusCode,
        userId: req.user?._id,
        severity: "error",
        metadata: { requestId: req.id },
      }).catch((persistErr) => log.error({ err: persistErr }, "Failed to persist ErrorLog entry"));
    } catch (requireErr) {
      log.error({ err: requireErr }, "ErrorLog model unavailable");
    }
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
