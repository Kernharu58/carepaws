const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const { protect, adminOnly, superAdminOnly } = require("../middleware/authMiddleware");
const { uploader } = require("../middleware/uploadMiddleware");
const authSchemas = require("../validators/auth.schema");
const userSchemas = require("../validators/user.schema");

// --- Public / self-service ---
router.post("/register", validateRequest(authSchemas.registerSchema), ctrl.register);
router.post("/login", validateRequest(authSchemas.loginSchema), ctrl.login);
router.post("/google", validateRequest(authSchemas.googleAuthSchema), ctrl.googleAuth);
router.post("/verify-email", validateRequest(authSchemas.verifyEmailSchema), ctrl.verifyEmail);
router.post("/forgot-password", validateRequest(authSchemas.forgotPasswordSchema), ctrl.forgotPassword);
router.post("/reset-password", validateRequest(authSchemas.resetPasswordSchema), ctrl.resetPassword);
// Production addition beyond the original route table (§5.1/§11.6.2): rotating refresh token.
router.post("/refresh", validateRequest(authSchemas.refreshTokenSchema), ctrl.refresh);

// --- Authenticated self-service ---
router.post("/logout", protect, validateRequest(authSchemas.logoutSchema), ctrl.logout);
router.get("/me", protect, ctrl.getMe);
router.put("/profile", protect, validateRequest(userSchemas.updateProfileSchema), ctrl.updateProfile);
router.post("/profile-picture", protect, uploader("image").single("profilePicture"), ctrl.uploadProfilePicture);
router.get("/favorites", protect, ctrl.getFavorites);
router.post("/favorites/:petId", protect, ctrl.toggleFavorite);
router.get("/sessions", protect, ctrl.getSessions);
router.delete("/sessions/:id", protect, ctrl.revokeSession);
router.delete("/sessions", protect, ctrl.revokeAllSessions);
router.get("/login-history", protect, ctrl.getMyLoginHistory);

// --- Admin: user management ---
router.get("/users", protect, adminOnly, ctrl.listUsers);
router.get("/users/verification-queue", protect, adminOnly, ctrl.verificationQueue);
router.get("/users/export", protect, adminOnly, ctrl.exportUsers);
router.put("/users/:id/role", protect, adminOnly, validateRequest(userSchemas.updateRoleSchema), ctrl.updateUserRole);
router.put("/users/:id/status", protect, adminOnly, validateRequest(userSchemas.updateStatusSchema), ctrl.updateUserStatus);
router.put(
  "/users/:id/verification",
  protect,
  adminOnly,
  validateRequest(userSchemas.updateVerificationSchema),
  ctrl.updateUserVerification
);
router.post("/users/:id/impersonate", protect, superAdminOnly, ctrl.impersonateUser);
router.delete("/users/:id", protect, adminOnly, ctrl.deleteUser);
router.post("/users/:id/restore", protect, adminOnly, ctrl.restoreUser);
router.delete("/users/:id/permanent", protect, superAdminOnly, ctrl.permanentlyDeleteUser);
router.get("/users/:id/history", protect, adminOnly, ctrl.userHistory);
router.get("/users/:id/login-history", protect, adminOnly, ctrl.userLoginHistory);
router.get("/audit-logs", protect, superAdminOnly, ctrl.listAuditLogs);
router.post("/admin/force-reset/:id", protect, adminOnly, ctrl.forceResetPassword);

module.exports = router;
