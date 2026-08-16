const UserDocument = require("../models/UserDocument");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { uploadBuffer } = require("../config/cloudinary");
const { notify } = require("../utils/notificationHelper");

const myDocuments = asyncHandler(async (req, res) => {
  const docs = await UserDocument.find({ user: req.user._id }).sort("-createdAt");
  res.status(200).json({ success: true, data: docs });
});

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const result = await uploadBuffer(req.file.buffer, { folder: "carepaws/user-documents" });

  const doc = await UserDocument.create({
    user: req.user._id,
    application: req.body.application,
    type: req.body.type,
    label: req.body.label,
    fileUrl: result.secure_url,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    expiresAt: req.body.expiresAt,
  });

  res.status(201).json({ success: true, data: doc });
});

const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await UserDocument.findOne({ _id: req.params.id, user: req.user._id });
  if (!doc) throw new AppError("Document not found", 404);

  await doc.deleteOne();
  res.status(200).json({ success: true, message: "Document deleted" });
});

const listDocuments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { filterFields: ["type", "status"] });

  const [data, total] = await Promise.all([
    UserDocument.find(filter).sort(sort).skip(skip).limit(limit).populate("user", "displayName email"),
    UserDocument.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const verifyDocument = asyncHandler(async (req, res) => {
  const doc = await UserDocument.findById(req.params.id);
  if (!doc) throw new AppError("Document not found", 404);

  doc.status = req.body.status;
  doc.rejectedReason = req.body.rejectedReason;
  doc.notes = req.body.notes;
  doc.verifiedBy = req.user._id;
  doc.verifiedAt = new Date();
  await doc.save();

  if (doc.status === "verified" || doc.status === "rejected") {
    await notify({
      recipient: doc.user,
      sender: req.user._id,
      type: "GENERAL",
      title: doc.status === "verified" ? "Document verified" : "Document needs attention",
      message:
        doc.status === "verified"
          ? `Your ${doc.type.replace(/_/g, " ")} has been verified.`
          : `Your ${doc.type.replace(/_/g, " ")} was not accepted: ${doc.rejectedReason || "please resubmit"}.`,
    });
  }

  res.status(200).json({ success: true, data: doc });
});

module.exports = { myDocuments, uploadDocument, deleteDocument, listDocuments, verifyDocument };
