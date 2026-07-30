const Archive = require("../models/Archive");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logAudit } = require("../utils/auditLogger");

/**
 * Known archivable collections. Deliberately explicit rather than reading
 * from mongoose.models directly — not every registered model should be
 * archivable (e.g. Session, ApiLog), so this is an allowlist that grows as
 * each domain adds a model that makes sense to archive wholesale.
 */
function modelRegistry() {
  return {
    User: require("../models/User"),
    Pet: require("../models/Pet"),
    Shelter: require("../models/Shelter"),
    InventoryItem: require("../models/InventoryItem"),
  };
}

function resolveModel(collection) {
  const model = modelRegistry()[collection];
  if (!model) {
    throw new AppError(
      `"${collection}" is not an archivable collection. Known: ${Object.keys(modelRegistry()).join(", ")}`,
      400
    );
  }
  return model;
}

const listArchive = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.sourceCollection) filter.sourceCollection = req.query.sourceCollection;
  if (String(req.query.includeRestored).toLowerCase() !== "true") {
    filter.restoredAt = { $exists: false };
  }

  const [data, total] = await Promise.all([
    Archive.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Archive.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

/** POST /api/archive/:collection — archives a record out of its normal collection entirely. */
const archiveRecord = asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const { id, reason } = req.body;
  if (!id) throw new AppError("id is required", 400);

  const Model = resolveModel(collection);
  const doc = await Model.findById(id);
  if (!doc) throw new AppError(`${collection} record not found`, 404);

  const archived = await Archive.create({
    sourceCollection: collection,
    originalId: doc._id,
    data: doc.toObject(),
    reason,
    archivedBy: req.user._id,
  });

  await doc.deleteOne();

  await logAudit({
    actor: req.user._id,
    action: "archive.create",
    metadata: { sourceCollection: collection, originalId: doc._id, reason },
    req,
  });

  res.status(201).json({ success: true, data: archived });
});

/** POST /api/archive/:id/restore — restores an archived record back to its original collection. */
const restoreArchivedRecord = asyncHandler(async (req, res) => {
  const archived = await Archive.findById(req.params.id);
  if (!archived) throw new AppError("Archived record not found", 404);
  if (archived.restoredAt) throw new AppError("This record has already been restored", 400);

  const Model = resolveModel(archived.sourceCollection);

  const { _id, ...data } = archived.data;
  await Model.create({ _id: archived.originalId, ...data });

  archived.restoredAt = new Date();
  archived.restoredBy = req.user._id;
  await archived.save();

  await logAudit({
    actor: req.user._id,
    action: "archive.restore",
    metadata: { sourceCollection: archived.sourceCollection, originalId: archived.originalId },
    req,
  });

  res.status(200).json({ success: true, message: "Record restored", data: archived });
});

module.exports = { listArchive, archiveRecord, restoreArchivedRecord };
