const cron = require("node-cron");
const { logger } = require("./utils/logger");
const { purgeExpiredSessions } = require("./jobs/reminderJobs");

/**
 * Wires all scheduled jobs. Each job is logged on start/finish — once the
 * System & Admin Ops domain lands (ScheduledJobLog model), this should
 * persist that log to the database too so ops can audit job health from
 * the admin panel, not just from process logs.
 */
function startCronJobs() {
  // Daily at 03:00 — low-traffic window.
  cron.schedule("0 3 * * *", async () => {
    const startedAt = Date.now();
    try {
      const { itemsProcessed } = await purgeExpiredSessions();
      logger.info(
        { job: "purgeExpiredSessions", durationMs: Date.now() - startedAt, itemsProcessed },
        "Scheduled job completed"
      );
    } catch (err) {
      logger.error({ err, job: "purgeExpiredSessions" }, "Scheduled job failed");
    }
  });

  logger.info("Cron jobs scheduled");
}

module.exports = { startCronJobs };
