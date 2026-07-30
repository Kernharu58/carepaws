const AuditLog = require("../models/AuditLog");
const { logger } = require("./logger");

/**
 * Writes an AuditLog entry for a staff-performed mutation. Never throws —
 * a failure to write an audit log should be logged loudly but must not
 * fail the request that triggered it.
 */
async function logAudit({
  actor,
  action,
  targetUser = null,
  metadata = null,
  entityType = null,
  entityId = null,
  previousValues = null,
  newValues = null,
  req = null,
}) {
  try {
    await AuditLog.create({
      actor,
      action,
      targetUser,
      metadata,
      entityType,
      entityId,
      previousValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
  } catch (err) {
    logger.error({ err, action }, "Failed to write audit log entry");
  }
}

module.exports = { logAudit };
