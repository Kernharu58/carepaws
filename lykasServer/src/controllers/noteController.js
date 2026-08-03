const Note = require("../models/Note");
const { AppError, asyncHandler } = require("../utils/AppError");

const VALID_ENTITY_TYPES = ["Pet", "User", "Volunteer", "InKindDonation", "Shelter"];

function assertValidEntityType(entityType) {
  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    throw new AppError(`Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`, 400);
  }
}

const listNotes = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  assertValidEntityType(entityType);

  const notes = await Note.find({ entityType, entityId }).sort("-createdAt").populate("author", "displayName");
  res.status(200).json({ success: true, data: notes });
});

const addNote = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  assertValidEntityType(entityType);

  const note = await Note.create({ entityType, entityId, author: req.user._id, text: req.body.text });
  res.status(201).json({ success: true, data: note });
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw new AppError("Note not found", 404);

  if (note.author.toString() !== req.user._id.toString() && !["admin", "super_admin"].includes(req.user.role)) {
    throw new AppError("You do not have permission to delete this note", 403);
  }

  await note.deleteOne();
  res.status(200).json({ success: true, message: "Note deleted" });
});

module.exports = { listNotes, addNote, deleteNote };
