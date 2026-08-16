require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");

const { connectDB } = require("./config/db");
const { attachSocketServer } = require("./socket");
const { startCronJobs } = require("./cronJob");
const { logger } = require("./utils/logger");
const requestId = require("./middleware/requestId");
const apiMonitorMiddleware = require("./middleware/apiMonitorMiddleware");
const maintenanceMode = require("./middleware/maintenanceMode");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimitMiddleware");

const authRoutes = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const apiMonitoringRoutes = require("./routes/apiMonitoringRoutes");
const systemRoutes = require("./routes/systemRoutes");
const petRoutes = require("./routes/petRoutes");
const shelterRoutes = require("./routes/shelterRoutes");
const shelterCareRoutes = require("./routes/shelterCareRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const archiveRoutes = require("./routes/archiveRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const homeVisitRoutes = require("./routes/homeVisitRoutes");
const riskAssessmentRoutes = require("./routes/riskAssessmentRoutes");
const adopterProfileRoutes = require("./routes/adopterProfileRoutes");
const fosterRoutes = require("./routes/fosterRoutes");
const monitoringReportRoutes = require("./routes/monitoringReportRoutes");
const babyBookRoutes = require("./routes/babyBookRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const emergencyReportRoutes = require("./routes/emergencyReportRoutes");
const eventRoutes = require("./routes/eventRoutes");
const eventAssignmentRoutes = require("./routes/eventAssignmentRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const contentRoutes = require("./routes/contentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatSessionRoutes = require("./routes/chatSessionRoutes");
const noteRoutes = require("./routes/noteRoutes");
const emailTemplateRoutes = require("./routes/emailTemplateRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const inKindDonationRoutes = require("./routes/inKindDonationRoutes");
const fileAssetRoutes = require("./routes/fileAssetRoutes");
const userDocumentRoutes = require("./routes/userDocumentRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const errorLogRoutes = require("./routes/errorLogRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const featureFlagRoutes = require("./routes/featureFlagRoutes");
const backupRoutes = require("./routes/backupRoutes");
const migrationRoutes = require("./routes/migrationRoutes");
const scheduledJobRoutes = require("./routes/scheduledJobRoutes");
const duplicateRoutes = require("./routes/duplicateRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reportsRoutes = require("./routes/reportsRoutes");

/**
 * §4 — CORS: requests with no Origin header are allowed through
 * unconditionally (needed for server-to-server calls and, once it lands,
 * the payment webhook — non-browser clients bypass the allowlist entirely
 * by design; do not "fix" this into breaking the webhook). In development,
 * falls back to a small hardcoded devOrigins list plus FRONTEND_URL. In
 * production, checks strictly against the FRONTEND_URL allowlist.
 */
function buildCorsOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const devOrigins = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"];
  const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true); // no-Origin requests: intentional bypass, see comment above
      if (isProd) {
        return allowedOrigins.includes(origin)
          ? callback(null, true)
          : callback(new Error("Not allowed by CORS"));
      }
      const allowed = [...devOrigins, ...allowedOrigins];
      return allowed.includes(origin) ? callback(null, true) : callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}

async function buildApp() {
  const app = express();
  const corsOptions = buildCorsOptions();

  // Behind a reverse proxy — needed for rate limiting / req.ip to behave correctly.
  app.set("trust proxy", 1);

  // Real middleware order from server.js (§4) — replicated deliberately,
  // not a "textbook" order: cors → body parsing → helmet → global rate
  // limiter (/api) → apiMonitor (/api) → maintenanceMode (global) → routes.
  app.use(cors(corsOptions));

  // §11.6 — PayMongo webhook signature verification (paymentController.js)
  // needs the exact raw bytes PayMongo signed. The global express.json()
  // below would parse-and-discard those bytes before the webhook handler
  // ever sees them, breaking every signature check. This skips JSON
  // parsing for that one path and instead gives it express.raw(), which
  // must run first, in registration order, for the skip to take effect.
  app.use("/api/payments/webhook", express.raw({ type: "*/*" }));
  app.use((req, res, next) => {
    if (req.path === "/api/payments/webhook") return next();
    express.json()(req, res, next);
  });

  app.use(express.urlencoded({ extended: true }));
  app.use(requestId); // §11.5 addition — needed before anything logs
  app.use(helmet());

  app.use("/api", await globalLimiter());
  app.use("/api", apiMonitorMiddleware);
  app.use(maintenanceMode);

  app.get("/", (req, res) => res.status(200).json({ success: true, message: "CarePaws API" }));
  app.get("/health", (req, res) => res.status(200).json({ success: true, status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/roles", roleRoutes);
  app.use("/api/api-keys", apiKeyRoutes);
  app.use("/api/monitoring/api", apiMonitoringRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api/pets", petRoutes);
  app.use("/api/shelters", shelterRoutes);
  app.use("/api/shelter-care", shelterCareRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/archive", archiveRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/interviews", interviewRoutes);
  app.use("/api/home-visits", homeVisitRoutes);
  app.use("/api/risk-assessments", riskAssessmentRoutes);
  app.use("/api/adopter-profile", adopterProfileRoutes);
  app.use("/api/foster", fosterRoutes);
  app.use("/api/monitoring-reports", monitoringReportRoutes);
  app.use("/api/baby-book", babyBookRoutes);
  app.use("/api/medical", medicalRecordRoutes);
  app.use("/api/emergency-reports", emergencyReportRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/event-assignments", eventAssignmentRoutes);
  app.use("/api/volunteers", volunteerRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/content", contentRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/chat-sessions", chatSessionRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/email-templates", emailTemplateRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/donations/goods", inKindDonationRoutes);
  app.use("/api/files", fileAssetRoutes);
  app.use("/api/documents", userDocumentRoutes);
  app.use("/api/audit-logs", auditLogRoutes);
  app.use("/api/errors", errorLogRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/feature-flags", featureFlagRoutes);
  app.use("/api/backups", backupRoutes);
  app.use("/api/migrations", migrationRoutes);
  app.use("/api/scheduled-jobs", scheduledJobRoutes);
  app.use("/api/duplicates", duplicateRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/reports", reportsRoutes);
  // Every domain from §5.2/§5.3 is now mounted — see the manifest for what's
  // been retrofitted (notification triggers, DB-backed maintenance mode,
  // ScheduledJobLog persistence) vs. what's a real, working, but
  // deliberately-scoped first pass.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function start() {
  try {
    await connectDB();

    const app = await buildApp();
    const server = http.createServer(app);

    attachSocketServer(server, buildCorsOptions());
    startCronJobs();

    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      logger.info({ port, env: process.env.NODE_ENV || "development" }, "CarePaws API listening");
    });

    process.on("unhandledRejection", (err) => {
      logger.fatal({ err }, "Unhandled promise rejection — shutting down");
      server.close(() => process.exit(1));
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

// Only auto-start when run directly — tests import buildApp() instead.
if (require.main === module) {
  start();
}

module.exports = { buildApp, buildCorsOptions };
