/**
 * §4 — globally 503-gates the API for planned downtime. Controlled by an
 * env var for this pass (MAINTENANCE_MODE=true); once the System & Admin
 * Ops domain lands, this should read a Settings/FeatureFlag document
 * instead so it can be toggled from the admin panel without a redeploy.
 * Health checks and the maintenance status itself always stay reachable.
 */
function maintenanceMode(req, res, next) {
  const isActive = String(process.env.MAINTENANCE_MODE).toLowerCase() === "true";

  const alwaysAllowed =
    req.path === "/health" || req.path === "/" || req.path === "/api/system/health";

  if (isActive && !alwaysAllowed) {
    return res.status(503).json({
      success: false,
      message: process.env.MAINTENANCE_MESSAGE || "CarePaws is temporarily down for maintenance.",
    });
  }

  next();
}

module.exports = maintenanceMode;
