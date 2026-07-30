const { AppError, asyncHandler } = require("../utils/AppError");
const Role = require("../models/Role");

/**
 * §5.1 — fine-grained, admin-configurable permissions on top of the coarse
 * role enum. `super_admin` always short-circuits to allowed; every other
 * role is checked against its Role document's `permissions` array, where
 * the literal string "*" grants everything. Preserves the real source's
 * wildcard convention exactly.
 */
function requirePermission(permission) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) throw new AppError("Not authenticated", 401);
    if (req.user.role === "super_admin") return next();

    const role = await Role.findOne({ key: req.user.role });
    const permissions = role?.permissions || [];

    if (permissions.includes("*") || permissions.includes(permission)) {
      return next();
    }

    throw new AppError("You do not have permission to perform this action", 403);
  });
}

module.exports = { requirePermission };
