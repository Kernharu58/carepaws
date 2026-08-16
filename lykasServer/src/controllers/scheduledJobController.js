const ScheduledJobLog = require("../models/ScheduledJobLog");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { runJob, JOB_REGISTRY } = require("../jobs/reminderJobs");

/** GET / — the distinct set of known jobs, with their most recent run. */
const listJobs = asyncHandler(async (req, res) => {
  const jobs = await Promise.all(
    Object.keys(JOB_REGISTRY).map(async (jobKey) => {
      const lastRun = await ScheduledJobLog.findOne({ jobKey }).sort("-createdAt");
      return { jobKey, label: JOB_REGISTRY[jobKey].label, lastRun };
    })
  );

  res.status(200).json({ success: true, data: jobs });
});

const jobHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { jobKey: req.params.jobKey };

  const [data, total] = await Promise.all([
    ScheduledJobLog.find(filter).sort("-createdAt").skip(skip).limit(limit),
    ScheduledJobLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const runJobNow = asyncHandler(async (req, res) => {
  const { jobKey } = req.params;
  if (!JOB_REGISTRY[jobKey]) throw new AppError(`Unknown job: ${jobKey}`, 404);

  const log = await runJob(jobKey, { triggeredBy: "manual", triggeredByUser: req.user._id });
  res.status(200).json({ success: true, data: log });
});

module.exports = { listJobs, jobHistory, runJobNow };
