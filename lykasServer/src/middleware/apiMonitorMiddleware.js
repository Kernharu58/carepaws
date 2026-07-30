const ApiLog = require("../models/ApiLog");
const { logger } = require("../utils/logger");

/**
 * §4 — mounted on /api, after the global rate limiter. Records method,
 * path, status code, duration, and requester for every API call, backing
 * both /api/monitoring/api's summary endpoint and general observability.
 * Fire-and-forget: a logging failure must never affect the response.
 */
function apiMonitorMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    ApiLog.create({
      method: req.method,
      path: req.baseUrl + (req.route?.path || req.path),
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?._id,
      ipAddress: req.ip,
    }).catch((err) => logger.error({ err }, "Failed to write ApiLog entry"));
  });

  next();
}

module.exports = apiMonitorMiddleware;
