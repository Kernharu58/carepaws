const User = require("../models/User");
const Application = require("../models/Application");
const RiskAssessment = require("../models/RiskAssessment");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");

/**
 * §5.2 — "a read/aggregation view over User + application/risk history (no
 * separate write model observed)". Nothing here is ever written directly;
 * it's assembled from User, Application, and RiskAssessment on read.
 */

const listAdopterProfiles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, {
    searchFields: ["displayName", "email"],
    filterFields: ["identityVerificationStatus"],
  });
  filter.role = "user";
  filter.isDeleted = false;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const applicationCounts = await Application.aggregate([
    { $match: { applicant: { $in: userIds } } },
    { $group: { _id: "$applicant", total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } } } },
  ]);
  const countsByUser = new Map(applicationCounts.map((c) => [c._id.toString(), c]));

  const data = users.map((u) => {
    const counts = countsByUser.get(u._id.toString());
    return {
      user: u.toSafeJSON(),
      applicationCount: counts?.total || 0,
      approvedAdoptions: counts?.approved || 0,
    };
  });

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getAdopterProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, isDeleted: false });
  if (!user) throw new AppError("User not found", 404);

  const [applications, riskAssessments] = await Promise.all([
    Application.find({ applicant: user._id })
      .sort("-createdAt")
      .populate("pet", "name species imageUrl"),
    RiskAssessment.find({ applicant: user._id }).sort("-createdAt").populate("pet", "name"),
  ]);

  res.status(200).json({
    success: true,
    data: {
      user: user.toSafeJSON(),
      applications,
      riskAssessments,
      summary: {
        totalApplications: applications.length,
        approvedApplications: applications.filter((a) => a.status === "approved").length,
        latestRiskLevel: riskAssessments[0]?.riskLevel || null,
      },
    },
  });
});

module.exports = { listAdopterProfiles, getAdopterProfile };
