const Pet = require("../models/Pet");
const AuditLog = require("../models/AuditLog");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");
const { softDelete, restore, permanentDelete } = require("../utils/softDeleteMixin");
const { logAudit } = require("../utils/auditLogger");
const { sendCsv } = require("../utils/exportUtil");
const { uploadBuffer } = require("../config/cloudinary");

const filterFields = ["species", "size", "gender", "energyLevel", "temperament", "status"];

/**
 * Builds the Mongo filter for pet listing. Uses $text (backed by the text
 * index on name/breed/description — §5.2/§8.2) instead of the generic
 * regex $or, since Pet is called out explicitly as a hot resource that
 * should not full-scan on free-text search.
 */
function buildPetFilter(query, { includeDeletedAllowed = false } = {}) {
  const filter = {};

  if (query.q) filter.$text = { $search: query.q };

  for (const field of filterFields) {
    const value = query[field];
    if (value !== undefined && value !== null && value !== "" && value !== "All") {
      filter[field] = value;
    }
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  if (!(includeDeletedAllowed && String(query.includeDeleted).toLowerCase() === "true")) {
    filter.isDeleted = false;
  }

  return filter;
}

// --- Public ---

const listPets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = buildPetFilter(req.query);
  const sort = req.query.q ? { score: { $meta: "textScore" } } : { createdAt: -1 };
  const projection = req.query.q ? { score: { $meta: "textScore" } } : undefined;

  const [data, total] = await Promise.all([
    Pet.find(filter, projection).sort(sort).skip(skip).limit(limit),
    Pet.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findOne({ _id: req.params.id, isDeleted: false });
  if (!pet) throw new AppError("Pet not found", 404);
  res.status(200).json({ success: true, data: pet });
});

// --- Authenticated self-service ---

const myPets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { owner: req.user._id, isDeleted: false };

  const [data, total] = await Promise.all([
    Pet.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Pet.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

// --- Admin ---

const listPetsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = buildPetFilter(req.query, { includeDeletedAllowed: true });

  const [data, total] = await Promise.all([
    Pet.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Pet.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const exportPets = asyncHandler(async (req, res) => {
  const filter = buildPetFilter(req.query, { includeDeletedAllowed: true });
  const pets = await Pet.find(filter).sort("-createdAt").lean();

  sendCsv(res, "pets.csv", pets, [
    { key: "name", label: "Name" },
    { key: "species", label: "Species" },
    { key: "breed", label: "Breed" },
    { key: "status", label: "Status" },
    { key: "gender", label: "Gender" },
    { key: "size", label: "Size" },
    { key: "createdAt", label: "Added" },
  ]);
});

const createPet = asyncHandler(async (req, res) => {
  let imageUrl;
  if (req.file) {
    const result = await uploadBuffer(req.file.buffer, { folder: "carepaws/pets" });
    imageUrl = result.secure_url;
  }

  const pet = await Pet.create({ ...req.body, imageUrl });

  await logAudit({
    actor: req.user._id,
    action: "pet.create",
    entityType: "Pet",
    entityId: pet._id,
    newValues: pet.toObject(),
    req,
  });

  res.status(201).json({ success: true, data: pet });
});

const updatePet = asyncHandler(async (req, res) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet) throw new AppError("Pet not found", 404);

  const previousValues = pet.toObject();

  if (req.file) {
    const result = await uploadBuffer(req.file.buffer, { folder: "carepaws/pets" });
    pet.imageUrl = result.secure_url;
  }
  Object.assign(pet, req.body);
  await pet.save();

  await logAudit({
    actor: req.user._id,
    action: "pet.update",
    entityType: "Pet",
    entityId: pet._id,
    previousValues,
    newValues: pet.toObject(),
    req,
  });

  res.status(200).json({ success: true, data: pet });
});

const deletePet = asyncHandler(async (req, res) => {
  const pet = await softDelete(Pet, req.params.id, req.user._id);
  if (!pet) throw new AppError("Pet not found", 404);

  await logAudit({
    actor: req.user._id,
    action: "pet.delete",
    entityType: "Pet",
    entityId: pet._id,
    req,
  });

  res.status(200).json({ success: true, message: "Pet deleted" });
});

const restorePet = asyncHandler(async (req, res) => {
  const pet = await restore(Pet, req.params.id);
  if (!pet) throw new AppError("Pet not found", 404);

  await logAudit({ actor: req.user._id, action: "pet.restore", entityType: "Pet", entityId: pet._id, req });

  res.status(200).json({ success: true, data: pet });
});

const permanentlyDeletePet = asyncHandler(async (req, res) => {
  const existing = await Pet.findById(req.params.id);
  if (!existing) throw new AppError("Pet not found", 404);
  const previousValues = existing.toObject();

  await permanentDelete(Pet, req.params.id);

  await logAudit({
    actor: req.user._id,
    action: "pet.permanent_delete",
    entityType: "Pet",
    entityId: req.params.id,
    previousValues,
    req,
  });

  res.status(200).json({ success: true, message: "Pet permanently deleted" });
});

/**
 * Finalizes an adoption. In this slice (Adoption Pipeline hasn't landed
 * yet) this is an admin-driven direct action; once Application/RiskAssessment
 * land, this should require an approved Application for the (pet, userId)
 * pair rather than trusting an admin's say-so alone — noted here rather
 * than silently left as a permanent shortcut.
 */
const adoptPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet || pet.isDeleted) throw new AppError("Pet not found", 404);
  if (!["Available", "Pending"].includes(pet.status)) {
    throw new AppError(`Pet is not available for adoption (current status: ${pet.status})`, 400);
  }

  const previousValues = pet.toObject();
  pet.status = "Adopted";
  pet.owner = req.body.userId;
  await pet.save();

  await logAudit({
    actor: req.user._id,
    action: "pet.adopt",
    entityType: "Pet",
    entityId: pet._id,
    previousValues,
    newValues: { status: pet.status, owner: pet.owner },
    req,
  });

  res.status(200).json({ success: true, data: pet });
});

const petHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { entityType: "Pet", entityId: req.params.id };

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort("-createdAt").skip(skip).limit(limit).populate("actor", "displayName email"),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

module.exports = {
  listPets,
  getPet,
  myPets,
  listPetsAdmin,
  exportPets,
  createPet,
  updatePet,
  deletePet,
  restorePet,
  permanentlyDeletePet,
  adoptPet,
  petHistory,
};
