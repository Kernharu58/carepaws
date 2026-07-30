const mongoose = require("mongoose");
const { getRedisClient } = require("../config/redis");

const pkg = require("../../package.json");

async function health(req, res) {
  const redisClient = await getRedisClient();

  res.status(200).json({
    success: true,
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisClient ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
  });
}

function version(req, res) {
  res.status(200).json({
    success: true,
    name: pkg.name,
    version: pkg.version,
    nodeEnv: process.env.NODE_ENV || "development",
  });
}

module.exports = { health, version };
