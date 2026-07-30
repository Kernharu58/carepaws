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
  app.use(express.json());
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
  // Remaining domains (applications, foster, payments, events, ...) mount here
  // as their slices land — see the manifest for what's built so far.

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
