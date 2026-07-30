const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient } = require("../config/redis");
const { logger } = require("../utils/logger");

/**
 * Builds a rate limiter backed by Redis when it's reachable, so limits
 * survive restarts and are shared correctly across more than one server
 * instance (§11.6.1). Falls back to express-rate-limit's default in-memory
 * MemoryStore — with a logged warning — if Redis is down, rather than
 * failing every request.
 */
async function buildLimiter({ windowMs, max, skip, message, prefix }) {
  const client = await getRedisClient();

  const store = client
    ? new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
        prefix: `rl:${prefix}:`,
      })
    : undefined;

  if (!store) {
    logger.warn({ prefix }, "Rate limiter falling back to in-memory store (Redis unavailable)");
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    store,
    message: { success: false, message },
  });
}

/** Global limiter: 500 requests / 15 min per IP, mounted on /api. */
async function globalLimiter() {
  return buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    prefix: "global",
    message: "Too many requests. Please try again later.",
  });
}

/** Login: 5 attempts / 15 min per IP; skipped if email/password missing from the body. */
async function loginLimiter() {
  return buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    prefix: "login",
    skip: (req) => !req.body?.email || !req.body?.password,
    message: "Too many login attempts. Please try again in 15 minutes.",
  });
}

/** Register: 3 attempts / hour per IP; skipped if email/password/displayName missing. */
async function registerLimiter() {
  return buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    prefix: "register",
    skip: (req) => !req.body?.email || !req.body?.password || !req.body?.displayName,
    message: "Too many registration attempts. Please try again later.",
  });
}

/** Password reset request: 3 attempts / hour per IP; skipped if email missing. */
async function passwordResetLimiter() {
  return buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    prefix: "password-reset",
    skip: (req) => !req.body?.email,
    message: "Too many password reset requests. Please try again later.",
  });
}

module.exports = { globalLimiter, loginLimiter, registerLimiter, passwordResetLimiter, buildLimiter };
