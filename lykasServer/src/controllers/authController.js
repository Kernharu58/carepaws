const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const Session = require("../models/Session");
const LoginHistory = require("../models/LoginHistory");
const TokenBlacklist = require("../models/TokenBlacklist");

const { AppError, asyncHandler } = require("../utils/AppError");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
} = require("../utils/tokenUtils");
const { sendTemplatedEmail } = require("../utils/emailService");
const { logAudit } = require("../utils/auditLogger");
const { buildListQuery, buildPagination, paginationParams } = require("../utils/queryBuilder");
const { sendCsv } = require("../utils/exportUtil");
const { nextFailedAttemptState } = require("../utils/lockoutPolicy");
const { softDelete, restore, permanentDelete } = require("../utils/softDeleteMixin");

const googleClient = new OAuth2Client();

function googleAudiences() {
  return [process.env.GOOGLE_CLIENT_ID, process.env.ANDROID_CLIENT_ID, process.env.IOS_CLIENT_ID].filter(
    Boolean
  );
}

async function issueSession(user, req) {
  const accessToken = generateAccessToken(user);
  const { raw, hash } = generateRefreshToken();

  await Session.create({
    user: user._id,
    token: hash,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    lastActiveAt: new Date(),
    expiresAt: refreshTokenExpiry(),
  });

  return { accessToken, refreshToken: raw };
}

async function recordLoginAttempt({ user, email, success, reason, req }) {
  await LoginHistory.create({
    user: user?._id,
    email,
    success,
    reason,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
}

// ---------------------------------------------------------------------------
// Self-service
// ---------------------------------------------------------------------------

const register = asyncHandler(async (req, res) => {
  const { displayName, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("An account with this email already exists", 400);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const user = await User.create({
    displayName,
    email,
    password,
    emailVerificationToken: hashToken(rawToken),
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const verifyUrl = `${process.env.MOBILE_APP_URL}verify-email?token=${rawToken}`;
  const { emailSkipped } = await sendTemplatedEmail("verify-email", user.email, {
    displayName: user.displayName,
    verifyUrl,
  });

  res.status(201).json({
    success: true,
    message: "Account created. Please check your email to verify your address.",
    data: { user: user.toSafeJSON() },
    emailSkipped,
    // Non-production convenience only — lets integration tests and local
    // dev exercise the verify-email flow without a configured email
    // transport. Never present when NODE_ENV === "production".
    ...(process.env.NODE_ENV !== "production" ? { devVerificationToken: rawToken } : {}),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    await recordLoginAttempt({ user: null, email, success: false, reason: "invalid_credentials", req });
    throw new AppError("Invalid email or password", 401);
  }

  // Auto-unlock once the cooldown window has passed.
  if (user.status === "locked" && user.lockedUntil && user.lockedUntil <= new Date()) {
    user.status = "active";
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
  }

  if (user.isLocked()) {
    await recordLoginAttempt({ user, email, success: false, reason: "account_locked", req });
    throw new AppError("Account is temporarily locked due to too many failed attempts", 423);
  }

  if (user.status === "suspended") {
    await recordLoginAttempt({ user, email, success: false, reason: "account_suspended", req });
    throw new AppError("Account is suspended", 403);
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    const next = nextFailedAttemptState(user.failedLoginAttempts);
    user.failedLoginAttempts = next.failedLoginAttempts;

    let reason = "invalid_credentials";
    if (next.shouldLock) {
      user.status = "locked";
      user.lockedUntil = next.lockedUntil;
      reason = "account_locked_threshold";
    }

    await user.save();
    await recordLoginAttempt({ user, email, success: false, reason, req });

    if (next.shouldLock) {
      throw new AppError("Too many failed attempts. Account locked for 30 minutes.", 423);
    }
    throw new AppError("Invalid email or password", 401);
  }

  user.failedLoginAttempts = 0;
  await user.save();
  await recordLoginAttempt({ user, email, success: true, reason: "password", req });

  const { accessToken, refreshToken } = await issueSession(user, req);

  res.status(200).json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken, refreshToken },
  });
});

const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const audiences = googleAudiences();
  if (audiences.length === 0) {
    throw new AppError("Google sign-in is not configured on this server", 500);
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: audiences });
    payload = ticket.getPayload();
  } catch {
    throw new AppError("Invalid Google credential", 401);
  }

  if (!payload?.email) throw new AppError("Google account has no verified email", 401);

  let user = await User.findOne({ email: payload.email.toLowerCase() });

  if (!user) {
    // Google-created accounts get a random, never-shared password hash —
    // the schema has no separate "googleId" field (see §5.2's exact field
    // list), so account matching is by verified email.
    const randomPassword = crypto.randomBytes(32).toString("hex");
    user = await User.create({
      displayName: payload.name || payload.email.split("@")[0],
      email: payload.email.toLowerCase(),
      password: randomPassword,
      emailVerified: true,
      profilePicture: payload.picture,
    });
  }

  if (user.isLocked()) throw new AppError("Account is temporarily locked", 423);
  if (user.status === "suspended") throw new AppError("Account is suspended", 403);

  await recordLoginAttempt({ user, email: user.email, success: true, reason: "google_oauth", req });
  const { accessToken, refreshToken } = await issueSession(user, req);

  res.status(200).json({ success: true, data: { user: user.toSafeJSON(), accessToken, refreshToken } });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const hashed = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) throw new AppError("Invalid or expired verification link", 400);

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Email verified successfully" });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond the same way to avoid leaking which emails have accounts.
  const genericResponse = {
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };

  if (!user) return res.status(200).json(genericResponse);

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = hashToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.MOBILE_APP_URL}reset-password?token=${rawToken}`;
  await sendTemplatedEmail("reset-password", user.email, {
    displayName: user.displayName,
    resetUrl,
  });

  res.status(200).json({
    ...genericResponse,
    ...(process.env.NODE_ENV !== "production" ? { devResetToken: rawToken } : {}),
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const hashed = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) throw new AppError("Invalid or expired reset link", 400);

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.failedLoginAttempts = 0;
  if (user.status === "locked") {
    user.status = "active";
    user.lockedUntil = undefined;
  }
  await user.save();

  // Log out every device — a changed password should invalidate old sessions.
  await Session.updateMany(
    { user: user._id, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );

  res.status(200).json({ success: true, message: "Password reset successfully. Please log in again." });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const hashed = hashToken(refreshToken);

  const session = await Session.findOne({ token: hashed, revoked: false }).select("+token");
  if (!session || session.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(session.user);
  if (!user || user.isDeleted || user.status !== "active") {
    throw new AppError("Account is not active", 401);
  }

  // Rotate: revoke the old refresh token, issue a brand new pair.
  session.revoked = true;
  session.revokedAt = new Date();
  await session.save();

  const { accessToken, refreshToken: newRefreshToken } = await issueSession(user, req);

  res.status(200).json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const decoded = require("jsonwebtoken").decode(req.token);
  await TokenBlacklist.create({
    token: req.token,
    userId: req.user._id,
    expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 60 * 60 * 1000),
    reason: "logout",
  });

  if (refreshToken) {
    await Session.updateOne(
      { user: req.user._id, token: hashToken(refreshToken) },
      { revoked: true, revokedAt: new Date() }
    );
  }

  res.status(200).json({ success: true, message: "Logged out" });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user.toSafeJSON() } });
});

const updateProfile = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.status(200).json({ success: true, data: { user: req.user.toSafeJSON() } });
});

const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No file uploaded", 400);
  const { uploadBuffer } = require("../config/cloudinary");
  const result = await uploadBuffer(req.file.buffer, { folder: "carepaws/profile-pictures" });

  req.user.profilePicture = result.secure_url;
  await req.user.save();

  res.status(200).json({ success: true, data: { profilePicture: req.user.profilePicture } });
});

const getFavorites = asyncHandler(async (req, res) => {
  const mongoose = require("mongoose");
  let user;
  if (mongoose.models.Pet) {
    user = await User.findById(req.user._id).populate("favorites");
  } else {
    // Pet domain lands in a later slice — return the raw ids until then.
    user = await User.findById(req.user._id);
  }
  res.status(200).json({ success: true, data: { favorites: user.favorites } });
});

const toggleFavorite = asyncHandler(async (req, res) => {
  const { petId } = req.params;
  const index = req.user.favorites.findIndex((id) => id.toString() === petId);
  let action;

  if (index === -1) {
    req.user.favorites.push(petId);
    action = "added";
  } else {
    req.user.favorites.splice(index, 1);
    action = "removed";
  }

  await req.user.save();
  res.status(200).json({ success: true, message: `Favorite ${action}`, data: { action } });
});

const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({
    user: req.user._id,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).sort("-lastActiveAt");

  res.status(200).json({ success: true, data: sessions });
});

const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) throw new AppError("Session not found", 404);

  session.revoked = true;
  session.revokedAt = new Date();
  await session.save();

  res.status(200).json({ success: true, message: "Session revoked" });
});

const revokeAllSessions = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  const keepHash = refreshToken ? hashToken(refreshToken) : null;

  const filter = { user: req.user._id, revoked: false };
  if (keepHash) filter.token = { $ne: keepHash };

  await Session.updateMany(filter, { revoked: true, revokedAt: new Date() });
  res.status(200).json({ success: true, message: "Other sessions revoked" });
});

const getMyLoginHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { user: req.user._id };

  const [data, total] = await Promise.all([
    LoginHistory.find(filter).sort("-createdAt").skip(skip).limit(limit),
    LoginHistory.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

// ---------------------------------------------------------------------------
// Admin — user management
// ---------------------------------------------------------------------------

const searchFields = ["displayName", "email"];
const filterFields = ["role", "status", "identityVerificationStatus"];

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, { searchFields, filterFields });

  if (String(req.query.includeDeleted).toLowerCase() !== "true") {
    filter.isDeleted = false;
  }

  const [data, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: data.map((u) => u.toSafeJSON()),
    pagination: buildPagination(total, page, limit),
  });
});

const verificationQueue = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { identityVerificationStatus: "pending", isDeleted: false };

  const [data, total] = await Promise.all([
    User.find(filter).sort("createdAt").skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: data.map((u) => u.toSafeJSON()),
    pagination: buildPagination(total, page, limit),
  });
});

const exportUsers = asyncHandler(async (req, res) => {
  const { filter } = buildListQuery(req.query, { searchFields, filterFields });
  filter.isDeleted = false;

  const users = await User.find(filter).sort("-createdAt").lean();

  sendCsv(res, "users.csv", users, [
    { key: "displayName", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "identityVerificationStatus", label: "Verification" },
    { key: "createdAt", label: "Joined" },
  ]);
});

async function findUserOr404(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const previousValues = { role: user.role };

  user.role = req.body.role;
  await user.save();

  await logAudit({
    actor: req.user._id,
    action: "user.role.update",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    previousValues,
    newValues: { role: user.role },
    req,
  });

  res.status(200).json({ success: true, data: { user: user.toSafeJSON() } });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const previousValues = { status: user.status };

  user.status = req.body.status;
  if (req.body.status !== "locked") user.lockedUntil = undefined;
  await user.save();

  if (["suspended", "locked"].includes(user.status)) {
    await Session.updateMany({ user: user._id, revoked: false }, { revoked: true, revokedAt: new Date() });
  }

  await logAudit({
    actor: req.user._id,
    action: "user.status.update",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    previousValues,
    newValues: { status: user.status, reason: req.body.reason },
    req,
  });

  res.status(200).json({ success: true, data: { user: user.toSafeJSON() } });
});

const updateUserVerification = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const previousValues = { identityVerificationStatus: user.identityVerificationStatus };

  user.identityVerificationStatus = req.body.identityVerificationStatus;
  user.identityVerificationNotes = req.body.identityVerificationNotes;
  user.identityVerifiedBy = req.user._id;
  user.identityVerifiedAt = new Date();
  await user.save();

  await logAudit({
    actor: req.user._id,
    action: "user.verification.update",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    previousValues,
    newValues: { identityVerificationStatus: user.identityVerificationStatus },
    req,
  });

  res.status(200).json({ success: true, data: { user: user.toSafeJSON() } });
});

const impersonateUser = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const accessToken = generateAccessToken(user);

  await logAudit({
    actor: req.user._id,
    action: "user.impersonate",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    req,
  });

  res.status(200).json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await softDelete(User, req.params.id, req.user._id);
  if (!user) throw new AppError("User not found", 404);

  await Session.updateMany({ user: user._id, revoked: false }, { revoked: true, revokedAt: new Date() });

  await logAudit({
    actor: req.user._id,
    action: "user.delete",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    req,
  });

  res.status(200).json({ success: true, message: "User deleted" });
});

const restoreUser = asyncHandler(async (req, res) => {
  const user = await restore(User, req.params.id);
  if (!user) throw new AppError("User not found", 404);

  await logAudit({
    actor: req.user._id,
    action: "user.restore",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    req,
  });

  res.status(200).json({ success: true, data: { user: user.toSafeJSON() } });
});

const permanentlyDeleteUser = asyncHandler(async (req, res) => {
  const existing = await findUserOr404(req.params.id);
  const previousValues = existing.toSafeJSON();

  await permanentDelete(User, req.params.id);

  await logAudit({
    actor: req.user._id,
    action: "user.permanent_delete",
    entityType: "User",
    entityId: req.params.id,
    previousValues,
    req,
  });

  res.status(200).json({ success: true, message: "User permanently deleted" });
});

const userHistory = asyncHandler(async (req, res) => {
  const AuditLog = require("../models/AuditLog");
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { entityType: "User", entityId: req.params.id };

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort("-createdAt").skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const userLoginHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const filter = { user: req.params.id };

  const [data, total] = await Promise.all([
    LoginHistory.find(filter).sort("-createdAt").skip(skip).limit(limit),
    LoginHistory.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const AuditLog = require("../models/AuditLog");
  const { page, limit, skip } = paginationParams(req.query);
  const { filter, sort } = buildListQuery(req.query, {
    searchFields: ["action"],
    filterFields: ["entityType"],
  });

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limit).populate("actor", "displayName email"),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data, pagination: buildPagination(total, page, limit) });
});

const forceResetPassword = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = hashToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await Session.updateMany({ user: user._id, revoked: false }, { revoked: true, revokedAt: new Date() });

  const resetUrl = `${process.env.MOBILE_APP_URL}reset-password?token=${rawToken}`;
  const { emailSkipped } = await sendTemplatedEmail("reset-password", user.email, {
    displayName: user.displayName,
    resetUrl,
  });

  await logAudit({
    actor: req.user._id,
    action: "user.force_reset",
    targetUser: user._id,
    entityType: "User",
    entityId: user._id,
    req,
  });

  res.status(200).json({ success: true, message: "Password reset email sent", emailSkipped });
});

module.exports = {
  register,
  login,
  googleAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  getMe,
  updateProfile,
  uploadProfilePicture,
  getFavorites,
  toggleFavorite,
  getSessions,
  revokeSession,
  revokeAllSessions,
  getMyLoginHistory,
  listUsers,
  verificationQueue,
  exportUsers,
  updateUserRole,
  updateUserStatus,
  updateUserVerification,
  impersonateUser,
  deleteUser,
  restoreUser,
  permanentlyDeleteUser,
  userHistory,
  userLoginHistory,
  listAuditLogs,
  forceResetPassword,
};
