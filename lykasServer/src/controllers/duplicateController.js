const User = require("../models/User");
const Pet = require("../models/Pet");
const { asyncHandler } = require("../utils/AppError");

/** GET /users — users sharing the same email domain isn't useful; group by exact display name instead, a reasonable low-noise duplicate signal. */
const duplicateUsers = asyncHandler(async (req, res) => {
  const groups = await User.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: { $toLower: "$displayName" }, count: { $sum: 1 }, users: { $push: { _id: "$_id", email: "$email", createdAt: "$createdAt" } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({ success: true, data: groups });
});

/** GET /pets — pets with the same name + species are the likeliest accidental double-entries. */
const duplicatePets = asyncHandler(async (req, res) => {
  const groups = await Pet.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: { name: { $toLower: "$name" }, species: "$species" },
        count: { $sum: 1 },
        pets: { $push: { _id: "$_id", status: "$status", createdAt: "$createdAt" } },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({ success: true, data: groups });
});

module.exports = { duplicateUsers, duplicatePets };
