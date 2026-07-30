const { createClient } = require("redis");
const { logger } = require("../utils/logger");

let client = null;
let connecting = null;

/**
 * §4 / §11.6.1 — the source declares `redis` as a dependency but never
 * imports it anywhere, so rate limiting is in-memory only and resets on
 * every restart. This module actually connects, and rateLimitMiddleware.js
 * backs its limiters with a RedisStore built from this client.
 *
 * Connection is lazy and non-fatal: if Redis is unreachable, callers get
 * `null` back and should fall back to an in-memory store with a logged
 * warning, so a Redis outage degrades rate-limit accuracy rather than
 * taking the whole API down.
 */
async function getRedisClient() {
  if (client?.isOpen) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      client = createClient({ url: process.env.REDIS_URL });
      client.on("error", (err) => logger.error({ err }, "Redis client error"));
      await client.connect();
      logger.info("Redis connected");
      return client;
    } catch (err) {
      logger.warn({ err }, "Redis unavailable — falling back to in-memory rate limiting");
      client = null;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

module.exports = { getRedisClient };
