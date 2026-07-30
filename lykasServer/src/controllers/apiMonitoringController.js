const ApiLog = require("../models/ApiLog");
const { asyncHandler } = require("../utils/AppError");

/**
 * GET /api/monitoring/api/summary — aggregate request volume, error rate,
 * and p95-ish latency over a recent window, for the admin panel's ops view.
 */
const summary = asyncHandler(async (req, res) => {
  const windowHours = Math.min(168, Math.max(1, parseInt(req.query.hours, 10) || 24));
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const [totals, byStatus, byPath] = await Promise.all([
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, count: { $sum: 1 }, avgDurationMs: { $avg: "$durationMs" } } },
    ]),
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $subtract: ["$statusCode", { $mod: ["$statusCode", 100] }] }, count: { $sum: 1 } } },
    ]),
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$path", count: { $sum: 1 }, avgDurationMs: { $avg: "$durationMs" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totalRequests = totals[0]?.count || 0;
  const errorCount = byStatus.filter((b) => b._id >= 400).reduce((sum, b) => sum + b.count, 0);

  res.status(200).json({
    success: true,
    data: {
      windowHours,
      totalRequests,
      avgDurationMs: Math.round(totals[0]?.avgDurationMs || 0),
      errorRate: totalRequests ? Number((errorCount / totalRequests).toFixed(4)) : 0,
      byStatusClass: byStatus.map((b) => ({ statusClass: `${b._id}s`, count: b.count })),
      topPaths: byPath.map((p) => ({
        path: p._id,
        count: p.count,
        avgDurationMs: Math.round(p.avgDurationMs || 0),
      })),
    },
  });
});

module.exports = { summary };
