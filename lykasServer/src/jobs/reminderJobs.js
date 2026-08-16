const Session = require("../models/Session");
const ScheduledJobLog = require("../models/ScheduledJobLog");
const { logger } = require("../utils/logger");

/**
 * Purges expired/revoked sessions so the collection doesn't grow forever.
 * (TokenBlacklist prunes itself via a MongoDB TTL index — see its model.)
 */
async function purgeExpiredSessions() {
  const result = await Session.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { revoked: true }],
  });
  return { itemsProcessed: result.deletedCount };
}

/**
 * Registry of every job this server knows how to run — the single source
 * of truth for both the cron schedule (cronJob.js) and the admin panel's
 * "run now" button (ScheduledJobController). Each entry's `run` function
 * returns `{ itemsProcessed }`; wrapping/logging is handled once by
 * `runJob` below rather than duplicated per job.
 *
 * §5.2/§9 call for reminder emails for upcoming appointments, vaccinations,
 * foster reports, etc. Those get added here as entries once their owning
 * domains' notification needs are prioritized — the registry pattern is
 * what makes that a one-entry addition rather than another cron.schedule
 * call plus another logging block.
 */
const JOB_REGISTRY = {
  purgeExpiredSessions: { label: "Purge expired sessions", run: purgeExpiredSessions },
};

/**
 * Runs one registered job and unconditionally logs the result to
 * ScheduledJobLog — this is what makes job health auditable from the
 * admin panel (§5.2's ScheduledJobLog model existing for exactly this)
 * instead of only living in process logs.
 */
async function runJob(jobKey, { triggeredBy = "cron", triggeredByUser = null } = {}) {
  const job = JOB_REGISTRY[jobKey];
  if (!job) throw new Error(`Unknown job: ${jobKey}`);

  const startedAt = new Date();
  let status = "success";
  let itemsProcessed = 0;
  let message = null;
  let error = null;

  try {
    const result = await job.run();
    itemsProcessed = result?.itemsProcessed ?? 0;
    message = `Completed successfully`;
  } catch (err) {
    status = "failed";
    error = err.message;
    logger.error({ err, jobKey }, "Scheduled job failed");
  }

  const finishedAt = new Date();

  return ScheduledJobLog.create({
    jobKey,
    label: job.label,
    status,
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    itemsProcessed,
    triggeredBy,
    triggeredByUser,
    message,
    error,
  });
}

module.exports = { JOB_REGISTRY, runJob };
