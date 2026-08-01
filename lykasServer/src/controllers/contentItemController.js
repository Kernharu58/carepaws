const ContentItem = require("../models/ContentItem");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");

const publicContent = asyncHandler(async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.category) filter.category = req.query.category;

  const items = await ContentItem.find(filter).sort("order title").select("-lastEditedBy");
  res.status(200).json({ success: true, data: items });
});

const publicContentBySlug = asyncHandler(async (req, res) => {
  const item = await ContentItem.findOne({ slug: req.params.slug, isPublished: true }).select("-lastEditedBy");
  if (!item) throw new AppError("Content not found", 404);
  res.status(200).json({ success: true, data: item });
});

const listContent = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, {
    searchFields: ["title", "body"],
    filterFields: ["type", "category", "isPublished"],
  });

  const [data, total] = await Promise.all([
    ContentItem.find(filter).sort(sort).skip(skip).limit(limit),
    ContentItem.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getContentItem = asyncHandler(async (req, res) => {
  const item = await ContentItem.findById(req.params.id);
  if (!item) throw new AppError("Content item not found", 404);
  res.status(200).json({ success: true, data: item });
});

const createContentItem = asyncHandler(async (req, res) => {
  const item = await ContentItem.create({ ...req.body, lastEditedBy: req.user._id });
  res.status(201).json({ success: true, data: item });
});

const updateContentItem = asyncHandler(async (req, res) => {
  const item = await ContentItem.findById(req.params.id);
  if (!item) throw new AppError("Content item not found", 404);

  Object.assign(item, req.body);
  item.version += 1;
  item.lastEditedBy = req.user._id;
  await item.save();

  res.status(200).json({ success: true, data: item });
});

const deleteContentItem = asyncHandler(async (req, res) => {
  const item = await ContentItem.findById(req.params.id);
  if (!item) throw new AppError("Content item not found", 404);

  await item.deleteOne();
  res.status(200).json({ success: true, message: "Content item deleted" });
});

module.exports = {
  publicContent,
  publicContentBySlug,
  listContent,
  getContentItem,
  createContentItem,
  updateContentItem,
  deleteContentItem,
};
