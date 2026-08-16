const ErrorLog = require("../models/ErrorLog");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");

/** POST /report — the admin/mobile error boundaries call this to surface a client-side error into the same queryable log as server errors. */
const reportError = asyncHandler(async (req, res) => {
  const { source, message, stack, route, severity, metadata } = req.body;

  const log = await ErrorLog.create({
    source: source || "server",
    message,
    stack,
    route,
    severity: severity || "error",
    metadata,
    userId: req.user?._id,
  });

  res.status(201).json({ success: true, data: { id: log._id } });
});

const listErrors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, {
    searchFields: ["message", "route"],
    filterFields: ["source", "severity", "resolved"],
  });

  const [data, total] = await Promise.all([
    ErrorLog.find(filter).sort(sort).skip(skip).limit(limit),
    ErrorLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const resolveError = asyncHandler(async (req, res) => {
  const log = await ErrorLog.findById(req.params.id);
  if (!log) throw new AppError("Error log entry not found", 404);

  log.resolved = true;
  log.resolvedBy = req.user._id;
  log.resolvedAt = new Date();
  await log.save();

  res.status(200).json({ success: true, data: log });
});

module.exports = { reportError, listErrors, resolveError };
