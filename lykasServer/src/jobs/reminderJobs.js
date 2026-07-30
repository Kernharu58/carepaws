const Session = require("../models/Session");
const { logger } = require("../utils/logger");

/**
 * Purges expired/revoked sessions so the collection doesn't grow forever.
 * (TokenBlacklist prunes itself via a MongoDB TTL index — see its model.)
 *
 * This is the only job wired up in this pass. §5.2/§9 call for reminder
 * emails for upcoming appointments, vaccinations, foster reports, etc. —
 * those get added here once the Adoption Pipeline and Foster & Post-
 * Adoption Care domains (which own those models) land, rather than being
 * stubbed out ahead of the data they depend on.
 */
async function purgeExpiredSessions() {
  const result = await Session.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { revoked: true }],
  });
  logger.info({ deletedCount: result.deletedCount }, "Purged expired/revoked sessions");
  return { itemsProcessed: result.deletedCount };
}

module.exports = { purgeExpiredSessions };
