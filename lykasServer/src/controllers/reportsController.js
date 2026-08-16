const Application = require("../models/Application");
const Payment = require("../models/Payment");
const InKindDonation = require("../models/InKindDonation");
const Volunteer = require("../models/Volunteer");
const { HealthCheck, BehavioralObservation } = require("../models/ShelterCare");
const { asyncHandler } = require("../utils/AppError");

function dateRangeFilter(req, field = "createdAt") {
  const filter = {};
  if (req.query.from) filter[field] = { ...(filter[field] || {}), $gte: new Date(req.query.from) };
  if (req.query.to) filter[field] = { ...(filter[field] || {}), $lte: new Date(req.query.to) };
  return filter;
}

const adoptionsReport = asyncHandler(async (req, res) => {
  const filter = { status: "approved", ...dateRangeFilter(req, "reviewedAt") };

  const [total, byType, byMonth] = await Promise.all([
    Application.countDocuments(filter),
    Application.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
    Application.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { year: { $year: "$reviewedAt" }, month: { $month: "$reviewedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: { totalApproved: total, byType: byType.map((t) => ({ type: t._id, count: t.count })), byMonth },
  });
});

const financialReport = asyncHandler(async (req, res) => {
  const filter = { status: "paid", ...dateRangeFilter(req, "paidAt") };

  const [paymentsByType, inKindByStatus] = await Promise.all([
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: "$type", count: { $sum: 1 }, totalCentavos: { $sum: "$amount" } } },
    ]),
    InKindDonation.aggregate([
      { $match: { isDeleted: false, ...dateRangeFilter(req) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const totalCentavos = paymentsByType.reduce((sum, t) => sum + t.totalCentavos, 0);

  res.status(200).json({
    success: true,
    data: {
      totalCollectedCentavos: totalCentavos,
      cashByType: paymentsByType.map((t) => ({ type: t._id, count: t.count, totalCentavos: t.totalCentavos })),
      inKindByStatus: inKindByStatus.map((s) => ({ status: s._id, count: s.count })),
    },
  });
});

const volunteersReport = asyncHandler(async (req, res) => {
  const [byStatus, totalHours, topVolunteers] = await Promise.all([
    Volunteer.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Volunteer.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$totalHours" } } },
    ]),
    Volunteer.find({ isDeleted: false, status: "approved" })
      .sort("-totalHours")
      .limit(10)
      .populate("user", "displayName"),
  ]);

  res.status(200).json({
    success: true,
    data: {
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      totalHoursLogged: totalHours[0]?.total || 0,
      topVolunteers: topVolunteers.map((v) => ({ name: v.user?.displayName, totalHours: v.totalHours })),
    },
  });
});

/** Welfare report — flagged health checks and behavioral observations, the shelter-floor "is anything wrong" signal. */
const welfareReport = asyncHandler(async (req, res) => {
  const filter = { flagged: true, ...dateRangeFilter(req, "date") };

  const [flaggedHealthChecks, flaggedBehaviorObs] = await Promise.all([
    HealthCheck.find(filter).sort("-date").populate("pet", "name species").limit(50),
    BehavioralObservation.find(filter).sort("-date").populate("pet", "name species").limit(50),
  ]);

  res.status(200).json({
    success: true,
    data: {
      flaggedHealthChecksCount: flaggedHealthChecks.length,
      flaggedBehaviorObsCount: flaggedBehaviorObs.length,
      flaggedHealthChecks,
      flaggedBehaviorObs,
    },
  });
});

module.exports = { adoptionsReport, financialReport, volunteersReport, welfareReport };
