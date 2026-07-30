const {
  HealthCheck,
  FeedingLog,
  BehavioralObservation,
  CageAssignment,
  QuarantinePeriod,
} = require("../models/ShelterCare");
const Pet = require("../models/Pet");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

async function assertPetExists(petId) {
  const pet = await Pet.findOne({ _id: petId, isDeleted: false });
  if (!pet) throw new AppError("Pet not found", 404);
  return pet;
}

async function listByPet(Model, petId, query, actorField) {
  const { page, limit, skip } = paginationParams(query);
  const filter = { pet: petId };

  let queryBuilder = Model.find(filter).sort("-date -createdAt").skip(skip).limit(limit);
  if (actorField) queryBuilder = queryBuilder.populate(actorField, "displayName");

  const [data, total] = await Promise.all([queryBuilder, Model.countDocuments(filter)]);

  return { data, pagination: buildPagination(total, page, limit) };
}

// --- Summary ---

const petCareSummary = asyncHandler(async (req, res) => {
  const petId = req.params.petId;
  await assertPetExists(petId);

  const [latestHealthCheck, latestFeeding, latestBehavior, activeCage, activeQuarantine] = await Promise.all([
    HealthCheck.findOne({ pet: petId }).sort("-date"),
    FeedingLog.findOne({ pet: petId }).sort("-date"),
    BehavioralObservation.findOne({ pet: petId }).sort("-date"),
    CageAssignment.findOne({ pet: petId, isActive: true }),
    QuarantinePeriod.findOne({ pet: petId, isActive: true }),
  ]);

  res.status(200).json({
    success: true,
    data: { latestHealthCheck, latestFeeding, latestBehavior, activeCage, activeQuarantine },
  });
});

// --- Health checks ---

const createHealthCheck = asyncHandler(async (req, res) => {
  await assertPetExists(req.body.pet);
  const doc = await HealthCheck.create({ ...req.body, checkedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const flaggedHealthChecks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { flagged: true };

  const [data, total] = await Promise.all([
    HealthCheck.find(filter).sort("-date").skip(skip).limit(limit).populate("pet", "name species").populate("checkedBy", "displayName"),
    HealthCheck.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const petHealthChecks = asyncHandler(async (req, res) => {
  const result = await listByPet(HealthCheck, req.params.petId, req.query, "checkedBy");
  res.status(200).json({ success: true, ...result });
});

// --- Feeding logs ---

const createFeedingLog = asyncHandler(async (req, res) => {
  await assertPetExists(req.body.pet);
  const doc = await FeedingLog.create({ ...req.body, loggedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const petFeedingLogs = asyncHandler(async (req, res) => {
  const result = await listByPet(FeedingLog, req.params.petId, req.query, "loggedBy");
  res.status(200).json({ success: true, ...result });
});

// --- Behavioral observations ---

const createBehavioralObservation = asyncHandler(async (req, res) => {
  await assertPetExists(req.body.pet);
  const doc = await BehavioralObservation.create({ ...req.body, observedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const petBehavioralObservations = asyncHandler(async (req, res) => {
  const result = await listByPet(BehavioralObservation, req.params.petId, req.query, "observedBy");
  res.status(200).json({ success: true, ...result });
});

// --- Cage assignments ---

const createCageAssignment = asyncHandler(async (req, res) => {
  await assertPetExists(req.body.pet);

  // A pet shouldn't hold two active cage assignments at once.
  await CageAssignment.updateMany(
    { pet: req.body.pet, isActive: true },
    { isActive: false, releasedAt: new Date() }
  );

  const doc = await CageAssignment.create({ ...req.body, assignedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const listCageAssignments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

  const [data, total] = await Promise.all([
    CageAssignment.find(filter).sort("-assignedAt").skip(skip).limit(limit).populate("pet", "name species"),
    CageAssignment.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const petCageAssignments = asyncHandler(async (req, res) => {
  const result = await listByPet(CageAssignment, req.params.petId, req.query, "assignedBy");
  res.status(200).json({ success: true, ...result });
});

const releaseCageAssignment = asyncHandler(async (req, res) => {
  const assignment = await CageAssignment.findById(req.params.assignmentId);
  if (!assignment) throw new AppError("Cage assignment not found", 404);

  assignment.isActive = false;
  assignment.releasedAt = new Date();
  await assignment.save();

  res.status(200).json({ success: true, data: assignment });
});

// --- Quarantine periods ---

const startQuarantine = asyncHandler(async (req, res) => {
  await assertPetExists(req.body.pet);
  const doc = await QuarantinePeriod.create({ ...req.body, startedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const listQuarantine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

  const [data, total] = await Promise.all([
    QuarantinePeriod.find(filter).sort("-startDate").skip(skip).limit(limit).populate("pet", "name species"),
    QuarantinePeriod.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const petQuarantine = asyncHandler(async (req, res) => {
  const result = await listByPet(QuarantinePeriod, req.params.petId, req.query, "startedBy");
  res.status(200).json({ success: true, ...result });
});

const endQuarantine = asyncHandler(async (req, res) => {
  const period = await QuarantinePeriod.findById(req.params.id);
  if (!period) throw new AppError("Quarantine period not found", 404);

  period.isActive = false;
  period.endDate = new Date();
  period.endedBy = req.user._id;
  await period.save();

  res.status(200).json({ success: true, data: period });
});

module.exports = {
  petCareSummary,
  createHealthCheck,
  flaggedHealthChecks,
  petHealthChecks,
  createFeedingLog,
  petFeedingLogs,
  createBehavioralObservation,
  petBehavioralObservations,
  createCageAssignment,
  listCageAssignments,
  petCageAssignments,
  releaseCageAssignment,
  startQuarantine,
  listQuarantine,
  petQuarantine,
  endQuarantine,
};
