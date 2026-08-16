const cron = require("node-cron");
const { logger } = require("./utils/logger");
const { runJob } = require("./jobs/reminderJobs");

/**
 * Wires all scheduled jobs from the JOB_REGISTRY in reminderJobs.js. Every
 * run — cron-triggered or manually triggered from the admin panel — goes
 * through the same runJob() wrapper, so ScheduledJobLog is always the
 * single source of truth for job health, not just process logs.
 */
function startCronJobs() {
  // Daily at 03:00 — low-traffic window.
  cron.schedule("0 3 * * *", async () => {
    try {
      const log = await runJob("purgeExpiredSessions", { triggeredBy: "cron" });
      logger.info({ jobKey: "purgeExpiredSessions", status: log.status, itemsProcessed: log.itemsProcessed }, "Scheduled job completed");
    } catch (err) {
      logger.error({ err, jobKey: "purgeExpiredSessions" }, "Scheduled job runner itself failed");
    }
  });

  logger.info("Cron jobs scheduled");
}

module.exports = { startCronJobs };
