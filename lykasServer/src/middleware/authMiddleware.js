const { AppError, asyncHandler } = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/tokenUtils");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/** Requires a valid, non-blacklisted access token; attaches req.user (full doc, no password). */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError("Not authenticated", 401);

  const blacklisted = await TokenBlacklist.exists({ token });
  if (blacklisted) throw new AppError("Session has been revoked", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  const user = await User.findById(payload.id);
  if (!user || user.isDeleted) throw new AppError("Account not found", 401);
  if (user.status === "suspended") throw new AppError("Account suspended", 403);
  if (user.isLocked()) throw new AppError("Account temporarily locked", 423);

  req.user = user;
  req.token = token;
  next();
});

/** Role gate — `adminOnly` in the route table means staff/admin/super_admin. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
}

/**
 * Attaches req.user if a valid, non-blacklisted access token is present,
 * but never rejects the request when one isn't — for routes that behave
 * the same either way but personalize when they can (e.g. error reports
 * from a logged-out screen still get accepted, just without a userId).
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const blacklisted = await TokenBlacklist.exists({ token });
    if (blacklisted) return next();

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id);
    if (user && !user.isDeleted && user.status === "active") {
      req.user = user;
      req.token = token;
    }
  } catch {
    // Invalid/expired token on an optional-auth route — proceed unauthenticated.
  }
  next();
});

const adminOnly = requireRole("staff", "admin", "super_admin");
const superAdminOnly = requireRole("super_admin");

module.exports = { protect, optionalAuth, requireRole, adminOnly, superAdminOnly };
