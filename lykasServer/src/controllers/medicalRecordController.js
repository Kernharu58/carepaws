const { Vaccination, VetVisit, MedicalRecordEntry } = require("../models/MedicalRecord");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

// --- Summary ---

const petSummary = asyncHandler(async (req, res) => {
  const petId = req.params.petId;

  const [vaccinations, vetVisits, records] = await Promise.all([
    Vaccination.find({ pet: petId }).sort("-dateGiven").limit(5),
    VetVisit.find({ pet: petId }).sort("-visitDate").limit(5),
    MedicalRecordEntry.find({ pet: petId }).sort("-date").limit(5),
  ]);

  res.status(200).json({ success: true, data: { recentVaccinations: vaccinations, recentVetVisits: vetVisits, recentRecords: records } });
});

// --- Vaccinations ---

const createVaccination = asyncHandler(async (req, res) => {
  const doc = await Vaccination.create({ ...req.body, recordedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

/** GET /vaccinations/upcoming — vaccines due within the next 30 days, across all pets. */
const upcomingVaccinations = asyncHandler(async (req, res) => {
  const days = Math.min(180, Math.max(1, parseInt(req.query.days, 10) || 30));
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const vaccinations = await Vaccination.find({ nextDueDate: { $lte: cutoff, $gte: new Date() } })
    .sort("nextDueDate")
    .populate("pet", "name species");

  res.status(200).json({ success: true, data: vaccinations });
});

const vaccinationsForPet = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { pet: req.params.petId };

  const [data, total] = await Promise.all([
    Vaccination.find(filter).sort("-dateGiven").skip(skip).limit(limit),
    Vaccination.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const updateVaccination = asyncHandler(async (req, res) => {
  const doc = await Vaccination.findById(req.params.id);
  if (!doc) throw new AppError("Vaccination record not found", 404);
  Object.assign(doc, req.body);
  await doc.save();
  res.status(200).json({ success: true, data: doc });
});

const deleteVaccination = asyncHandler(async (req, res) => {
  const doc = await Vaccination.findById(req.params.id);
  if (!doc) throw new AppError("Vaccination record not found", 404);
  await doc.deleteOne();
  res.status(200).json({ success: true, message: "Vaccination record deleted" });
});

// --- Vet visits ---

const createVetVisit = asyncHandler(async (req, res) => {
  const doc = await VetVisit.create({ ...req.body, recordedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const vetVisitsForPet = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { pet: req.params.petId };

  const [data, total] = await Promise.all([
    VetVisit.find(filter).sort("-visitDate").skip(skip).limit(limit),
    VetVisit.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const updateVetVisit = asyncHandler(async (req, res) => {
  const doc = await VetVisit.findById(req.params.id);
  if (!doc) throw new AppError("Vet visit record not found", 404);
  Object.assign(doc, req.body);
  await doc.save();
  res.status(200).json({ success: true, data: doc });
});

const deleteVetVisit = asyncHandler(async (req, res) => {
  const doc = await VetVisit.findById(req.params.id);
  if (!doc) throw new AppError("Vet visit record not found", 404);
  await doc.deleteOne();
  res.status(200).json({ success: true, message: "Vet visit record deleted" });
});

// --- General records ---

const createRecord = asyncHandler(async (req, res) => {
  const doc = await MedicalRecordEntry.create({ ...req.body, recordedBy: req.user._id });
  res.status(201).json({ success: true, data: doc });
});

const recordsForPet = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { pet: req.params.petId };

  const [data, total] = await Promise.all([
    MedicalRecordEntry.find(filter).sort("-date").skip(skip).limit(limit),
    MedicalRecordEntry.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const updateRecord = asyncHandler(async (req, res) => {
  const doc = await MedicalRecordEntry.findById(req.params.id);
  if (!doc) throw new AppError("Medical record not found", 404);
  Object.assign(doc, req.body);
  await doc.save();
  res.status(200).json({ success: true, data: doc });
});

const deleteRecord = asyncHandler(async (req, res) => {
  const doc = await MedicalRecordEntry.findById(req.params.id);
  if (!doc) throw new AppError("Medical record not found", 404);
  await doc.deleteOne();
  res.status(200).json({ success: true, message: "Medical record deleted" });
});

module.exports = {
  petSummary,
  createVaccination,
  upcomingVaccinations,
  vaccinationsForPet,
  updateVaccination,
  deleteVaccination,
  createVetVisit,
  vetVisitsForPet,
  updateVetVisit,
  deleteVetVisit,
  createRecord,
  recordsForPet,
  updateRecord,
  deleteRecord,
};
