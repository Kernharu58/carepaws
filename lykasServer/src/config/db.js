const mongoose = require("mongoose");
const dns = require("dns");
const { logger } = require("../utils/logger");

async function connectDB() {
  // Real line from the source server.js — avoids flaky local DNS resolvers
  // when doing the SRV lookup for a MongoDB Atlas connection string.
  dns.setServers(["8.8.8.8", "1.1.1.1"]);

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set — see .env.example");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(process.env.MONGO_URI);
  logger.info({ host: mongoose.connection.host }, "MongoDB connected");

  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
}

module.exports = { connectDB };
