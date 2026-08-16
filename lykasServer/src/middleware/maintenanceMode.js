const CACHE_TTL_MS = parseInt(process.env.MAINTENANCE_CACHE_TTL_MS, 10) || 10 * 1000;
let cache = { checkedAt: 0, isActive: false, message: null };

/**
 * §4 — globally 503-gates the API for planned downtime. Reads a
 * FeatureFlag document (key: "maintenance_mode") so it can be toggled
 * from the admin panel without a redeploy, as noted when this middleware
 * was first written (System & Admin Ops domain, now landed). Falls back
 * to the MAINTENANCE_MODE env var if the flag doesn't exist yet (e.g. a
 * fresh install before any FeatureFlag document has been created) — env
 * var stays useful for a boot-time override regardless.
 *
 * Since this middleware runs on every single request, the flag is cached
 * in memory for CACHE_TTL_MS rather than queried from Mongo per-request —
 * flipping maintenance mode takes effect within ~10s, not instantly, which
 * is an acceptable trade for not adding a DB round-trip to every request.
 *
 * Health checks and the maintenance status itself always stay reachable.
 */
async function maintenanceMode(req, res, next) {
  const alwaysAllowed =
    req.path === "/health" || req.path === "/" || req.path === "/api/system/health";
  if (alwaysAllowed) return next();

  if (Date.now() - cache.checkedAt > CACHE_TTL_MS) {
    let isActive = String(process.env.MAINTENANCE_MODE).toLowerCase() === "true";
    let message = process.env.MAINTENANCE_MESSAGE || null;

    try {
      const FeatureFlag = require("../models/FeatureFlag");
      const flag = await FeatureFlag.findOne({ key: "maintenance_mode" });
      if (flag) {
        isActive = flag.enabled;
        message = flag.description || message;
      }
    } catch {
      // Mongoose not connected yet (e.g. very early boot) — fall back to the env var above.
    }

    cache = { checkedAt: Date.now(), isActive, message };
  }

  if (cache.isActive) {
    return res.status(503).json({
      success: false,
      message: cache.message || "CarePaws is temporarily down for maintenance.",
    });
  }

  next();
}

module.exports = maintenanceMode;
