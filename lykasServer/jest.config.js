module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,
  testPathIgnorePatterns: ["/node_modules/"],
  collectCoverageFrom: [
    "src/controllers/**/*.js",
    "src/utils/**/*.js",
    "src/middleware/**/*.js",
    "!src/server.js",
  ],
  coverageThreshold: {
    "./src/controllers/authController.js": { statements: 70, branches: 60, functions: 70, lines: 70 },
    "./src/utils/queryBuilder.js": { statements: 70, branches: 60, functions: 70, lines: 70 },
    "./src/utils/lockoutPolicy.js": { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
};
