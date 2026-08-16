const Pet = require("../models/Pet");
const Application = require("../models/Application");
const User = require("../models/User");
const { asyncHandler } = require("../utils/AppError");

const overview = asyncHandler(async (req, res) => {
  const [totalPets, totalUsers, totalApplications, adoptedPets] = await Promise.all([
    Pet.countDocuments({ isDeleted: false }),
    User.countDocuments({ isDeleted: false, role: "user" }),
    Application.countDocuments(),
    Pet.countDocuments({ status: "Adopted", isDeleted: false }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPets,
      totalUsers,
      totalApplications,
      adoptedPets,
      adoptionRate: totalPets ? Number((adoptedPets / totalPets).toFixed(4)) : 0,
    },
  });
});

/** GET /trends — new applications and new pets, grouped by month, over the trailing N months (default 6). */
const trends = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const monthGroup = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };

  const [applicationTrend, petTrend] = await Promise.all([
    Application.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: monthGroup, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Pet.aggregate([
      { $match: { createdAt: { $gte: since }, isDeleted: false } },
      { $group: { _id: monthGroup, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  res.status(200).json({ success: true, data: { applications: applicationTrend, pets: petTrend } });
});

const petsBreakdown = asyncHandler(async (req, res) => {
  const [bySpecies, byStatus, bySize] = await Promise.all([
    Pet.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: "$species", count: { $sum: 1 } } }]),
    Pet.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Pet.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: "$size", count: { $sum: 1 } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      bySpecies: bySpecies.map((s) => ({ species: s._id, count: s.count })),
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      bySize: bySize.map((s) => ({ size: s._id, count: s.count })),
    },
  });
});

module.exports = { overview, trends, petsBreakdown };
