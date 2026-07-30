const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";

/**
 * Structured JSON logs in production, pretty-printed in development.
 * §11.5 — replaces the bare console.log/console.error calls in the original source.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
      },
  base: { service: "lykas-server" },
});

/**
 * Returns a child logger carrying the request's correlation id (§11.5), so every
 * log line for a request — and any ErrorLog record created during it — can be
 * traced back to that single request.
 */
function childLogger(requestId) {
  return requestId ? logger.child({ requestId }) : logger;
}

module.exports = { logger, childLogger };
