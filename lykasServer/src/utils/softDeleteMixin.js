/**
 * §8.3 — soft-delete + restore + permanent-delete is a repeated three-step
 * pattern (DELETE /:id → soft, POST /:id/restore, DELETE /:id/permanent
 * restricted to super_admin) across every resource that has isDeleted/
 * deletedAt/deletedBy fields. Implemented once here instead of per-resource.
 */
async function softDelete(Model, id, actorId) {
  const doc = await Model.findById(id);
  if (!doc) return null;

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  doc.deletedBy = actorId;
  await doc.save();
  return doc;
}

async function restore(Model, id) {
  const doc = await Model.findById(id);
  if (!doc) return null;

  doc.isDeleted = false;
  doc.deletedAt = undefined;
  doc.deletedBy = undefined;
  await doc.save();
  return doc;
}

async function permanentDelete(Model, id) {
  const doc = await Model.findById(id);
  if (!doc) return null;

  await doc.deleteOne();
  return doc;
}

module.exports = { softDelete, restore, permanentDelete };
