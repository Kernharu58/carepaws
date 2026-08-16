const FileAsset = require("../models/FileAsset");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { uploadBuffer, cloudinary } = require("../config/cloudinary");

const listFiles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { filterFields: ["category", "relatedModel"] });
  filter.isDeleted = false;

  const [data, total] = await Promise.all([
    FileAsset.find(filter).sort(sort).skip(skip).limit(limit).populate("uploadedBy", "displayName"),
    FileAsset.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const storageStats = asyncHandler(async (req, res) => {
  const [byCategory, totals] = await Promise.all([
    FileAsset.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$category", count: { $sum: 1 }, totalBytes: { $sum: "$sizeBytes" } } },
    ]),
    FileAsset.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, count: { $sum: 1 }, totalBytes: { $sum: "$sizeBytes" } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalFiles: totals[0]?.count || 0,
      totalBytes: totals[0]?.totalBytes || 0,
      byCategory: byCategory.map((c) => ({ category: c._id, count: c.count, totalBytes: c.totalBytes || 0 })),
    },
  });
});

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const result = await uploadBuffer(req.file.buffer, { folder: "carepaws/files" });

  const asset = await FileAsset.create({
    fileName: req.file.originalname,
    url: result.secure_url,
    publicId: result.public_id,
    category: req.body.category,
    relatedModel: req.body.relatedModel,
    relatedId: req.body.relatedId,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    uploadedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: asset });
});

const deleteFile = asyncHandler(async (req, res) => {
  const asset = await FileAsset.findById(req.params.id);
  if (!asset) throw new AppError("File not found", 404);

  asset.isDeleted = true;
  asset.deletedAt = new Date();
  await asset.save();

  if (asset.publicId) {
    try {
      await cloudinary.uploader.destroy(asset.publicId);
    } catch (err) {
      req.log?.warn({ err, publicId: asset.publicId }, "Failed to delete remote Cloudinary asset");
    }
  }

  res.status(200).json({ success: true, message: "File deleted" });
});

module.exports = { listFiles, storageStats, uploadFile, deleteFile };
