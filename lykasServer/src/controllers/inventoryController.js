const InventoryItem = require("../models/InventoryItem");
const { AppError, asyncHandler } = require("../utils/AppError");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { logAudit } = require("../utils/auditLogger");

const searchFields = ["name", "supplier", "location"];
const filterFields = ["category"];

const summary = asyncHandler(async (req, res) => {
  const [byCategory, lowStockCount, totals] = await Promise.all([
    InventoryItem.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" } } },
    ]),
    InventoryItem.countDocuments({ $expr: { $lte: ["$quantity", "$minThreshold"] } }),
    InventoryItem.countDocuments({}),
  ]);

  res.status(200).json({
    success: true,
    data: {
      itemCount: totals,
      lowStockCount,
      byCategory: byCategory.map((c) => ({
        category: c._id,
        itemCount: c.count,
        totalQuantity: c.totalQuantity,
      })),
    },
  });
});

const listInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });

  if (String(req.query.lowStock).toLowerCase() === "true") {
    filter.$expr = { $lte: ["$quantity", "$minThreshold"] };
  }

  const [data, total] = await Promise.all([
    InventoryItem.find(filter).sort(sort).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new AppError("Inventory item not found", 404);
  res.status(200).json({ success: true, data: item });
});

const createInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.create(req.body);

  await logAudit({
    actor: req.user._id,
    action: "inventory.create",
    metadata: { name: item.name },
    req,
  });

  res.status(201).json({ success: true, data: item });
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new AppError("Inventory item not found", 404);

  Object.assign(item, req.body);
  await item.save();

  res.status(200).json({ success: true, data: item });
});

const adjustInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new AppError("Inventory item not found", 404);

  const { type, quantity, note } = req.body;
  const newQuantity = item.quantity + quantity;
  if (newQuantity < 0) {
    throw new AppError("Adjustment would result in negative stock", 400);
  }

  item.quantity = newQuantity;
  item.movements.push({ type, quantity, note, actor: req.user._id, createdAt: new Date() });

  if (type === "restock") {
    item.lastRestockedAt = new Date();
    item.lastRestockedBy = req.user._id;
  }

  await item.save();

  await logAudit({
    actor: req.user._id,
    action: "inventory.adjust",
    metadata: { itemId: item._id, name: item.name, type, quantity, resultingQuantity: item.quantity },
    req,
  });

  res.status(200).json({ success: true, data: item });
});

const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new AppError("Inventory item not found", 404);

  await item.deleteOne();

  await logAudit({ actor: req.user._id, action: "inventory.delete", metadata: { name: item.name }, req });

  res.status(200).json({ success: true, message: "Inventory item deleted" });
});

module.exports = {
  summary,
  listInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryItem,
  deleteInventoryItem,
};
