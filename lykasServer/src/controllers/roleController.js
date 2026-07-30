const Role = require("../models/Role");
const { AppError, asyncHandler } = require("../utils/AppError");
const { logAudit } = require("../utils/auditLogger");

const listRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort("key");
  res.status(200).json({ success: true, data: roles });
});

const createRole = asyncHandler(async (req, res) => {
  const existing = await Role.findOne({ key: req.body.key });
  if (existing) throw new AppError("A role with this key already exists", 400);

  const role = await Role.create(req.body);

  await logAudit({
    actor: req.user._id,
    action: "role.create",
    metadata: { key: role.key },
    req,
  });

  res.status(201).json({ success: true, data: role });
});

const updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.isSystem) throw new AppError("System roles cannot be modified", 403);

  const previousValues = role.toObject();
  Object.assign(role, req.body);
  await role.save();

  await logAudit({
    actor: req.user._id,
    action: "role.update",
    previousValues,
    newValues: role.toObject(),
    req,
  });

  res.status(200).json({ success: true, data: role });
});

const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.isSystem) throw new AppError("System roles cannot be deleted", 403);

  await role.deleteOne();

  await logAudit({ actor: req.user._id, action: "role.delete", metadata: { key: role.key }, req });

  res.status(200).json({ success: true, message: "Role deleted" });
});

module.exports = { listRoles, createRole, updateRole, deleteRole };
