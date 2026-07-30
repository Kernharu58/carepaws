const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongod;

// Test env defaults — set before any module that reads process.env at
// import time (tokenUtils, rate limiters, etc.) gets required.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-at-least-32-characters-long";
process.env.ACCESS_TOKEN_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS = "30";
process.env.NODE_ENV = "test";
process.env.MOBILE_APP_URL = "carepaws://";
// Deliberately unset EMAIL_*/REDIS_URL in tests — exercises the graceful
// degradation paths (emailSkipped:true, in-memory rate-limit fallback)
// rather than requiring live infrastructure to run the suite.

async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}

async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

module.exports = { connect, closeDatabase, clearCollections };
