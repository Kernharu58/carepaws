const AuditLog = require("../models/AuditLog");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");

/** GET /actions — the distinct set of action strings ever logged, for populating an admin filter dropdown. */
const listActions = asyncHandler(async (req, res) => {
  const actions = await AuditLog.distinct("action");
  res.status(200).json({ success: true, data: actions.sort() });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, {
    searchFields: ["action"],
    filterFields: ["entityType", "action"],
  });

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limit).populate("actor", "displayName email"),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getAuditLog = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id).populate("actor", "displayName email");
  if (!log) throw new AppError("Audit log entry not found", 404);
  res.status(200).json({ success: true, data: log });
});

module.exports = { listActions, listAuditLogs, getAuditLog };
