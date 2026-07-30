const Shelter = require("../models/Shelter");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logAudit } = require("../utils/auditLogger");

const searchFields = ["name", "address", "contactPerson"];
const filterFields = ["type", "status"];

const summary = asyncHandler(async (req, res) => {
  const [byType, byStatus, totals] = await Promise.all([
    Shelter.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    Shelter.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Shelter.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: "$capacity" },
          totalOccupancy: { $sum: "$currentOccupancy" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalCapacity = totals[0]?.totalCapacity || 0;
  const totalOccupancy = totals[0]?.totalOccupancy || 0;

  res.status(200).json({
    success: true,
    data: {
      shelterCount: totals[0]?.count || 0,
      totalCapacity,
      totalOccupancy,
      utilizationRate: totalCapacity ? Number((totalOccupancy / totalCapacity).toFixed(4)) : 0,
      byType: byType.map((t) => ({ type: t._id, count: t.count })),
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    },
  });
});

const listShelters = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });

  const [data, total] = await Promise.all([
    Shelter.find(filter).sort(sort).skip(skip).limit(limit),
    Shelter.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getShelter = asyncHandler(async (req, res) => {
  const shelter = await Shelter.findById(req.params.id);
  if (!shelter) throw new AppError("Shelter not found", 404);
  res.status(200).json({ success: true, data: shelter });
});

const createShelter = asyncHandler(async (req, res) => {
  const shelter = await Shelter.create({ ...req.body, createdBy: req.user._id });

  await logAudit({
    actor: req.user._id,
    action: "shelter.create",
    entityType: "Shelter",
    entityId: shelter._id,
    newValues: shelter.toObject(),
    req,
  });

  res.status(201).json({ success: true, data: shelter });
});

const updateShelter = asyncHandler(async (req, res) => {
  const shelter = await Shelter.findById(req.params.id);
  if (!shelter) throw new AppError("Shelter not found", 404);

  const previousValues = shelter.toObject();
  Object.assign(shelter, req.body);
  await shelter.save();

  await logAudit({
    actor: req.user._id,
    action: "shelter.update",
    entityType: "Shelter",
    entityId: shelter._id,
    previousValues,
    newValues: shelter.toObject(),
    req,
  });

  res.status(200).json({ success: true, data: shelter });
});

const deleteShelter = asyncHandler(async (req, res) => {
  const shelter = await Shelter.findById(req.params.id);
  if (!shelter) throw new AppError("Shelter not found", 404);

  await shelter.deleteOne();

  await logAudit({
    actor: req.user._id,
    action: "shelter.delete",
    entityType: "Shelter",
    entityId: req.params.id,
    previousValues: shelter.toObject(),
    req,
  });

  res.status(200).json({ success: true, message: "Shelter deleted" });
});

module.exports = { summary, listShelters, getShelter, createShelter, updateShelter, deleteShelter };
