const BabyBook = require("../models/BabyBook");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildPagination, paginationParams } = require("../utils/queryBuilder");

const myEntries = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { addedBy: req.user._id };

  const [data, total] = await Promise.all([
    BabyBook.find(filter).sort("-date").skip(skip).limit(limit).populate("pet", "name species imageUrl"),
    BabyBook.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getEntry = asyncHandler(async (req, res) => {
  const entry = await BabyBook.findById(req.params.id).populate("pet", "name species imageUrl");
  if (!entry) throw new AppError("Baby book entry not found", 404);
  res.status(200).json({ success: true, data: entry });
});

const createEntry = asyncHandler(async (req, res) => {
  const entry = await BabyBook.create({ ...req.body, addedBy: req.user._id });
  res.status(201).json({ success: true, data: entry });
});

const updateEntry = asyncHandler(async (req, res) => {
  const entry = await BabyBook.findById(req.params.id);
  if (!entry) throw new AppError("Baby book entry not found", 404);

  if (entry.addedBy.toString() !== req.user._id.toString() && !["staff", "admin", "super_admin"].includes(req.user.role)) {
    throw new AppError("You do not have permission to edit this entry", 403);
  }

  Object.assign(entry, req.body);
  await entry.save();

  res.status(200).json({ success: true, data: entry });
});

const deleteEntry = asyncHandler(async (req, res) => {
  const entry = await BabyBook.findById(req.params.id);
  if (!entry) throw new AppError("Baby book entry not found", 404);

  if (entry.addedBy.toString() !== req.user._id.toString() && !["staff", "admin", "super_admin"].includes(req.user.role)) {
    throw new AppError("You do not have permission to delete this entry", 403);
  }

  await entry.deleteOne();
  res.status(200).json({ success: true, message: "Entry deleted" });
});

const entriesForPet = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { pet: req.params.petId };

  const [data, total] = await Promise.all([
    BabyBook.find(filter).sort("-date").skip(skip).limit(limit).populate("addedBy", "displayName"),
    BabyBook.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

module.exports = { myEntries, getEntry, createEntry, updateEntry, deleteEntry, entriesForPet };
