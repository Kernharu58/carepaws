const request = require("supertest");
const { connect, closeDatabase, clearCollections } = require("../setup");
const { buildApp } = require("../../src/server");
const User = require("../../src/models/User");
const ScheduledJobLog = require("../../src/models/ScheduledJobLog");
const Session = require("../../src/models/Session");

let app;

beforeAll(async () => {
  await connect();
  app = await buildApp();
});

afterEach(async () => {
  await clearCollections();
});

afterAll(async () => {
  await closeDatabase();
});

async function makeUser(role = "user") {
  const user = await User.create({
    displayName: `${role} person`,
    email: `${role}-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
    role,
    emailVerified: true,
  });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: "password123" });
  return { user, accessToken: loginRes.body.data.accessToken };
}

describe("Maintenance mode driven by FeatureFlag", () => {
  it("blocks API requests with a 503 once the maintenance_mode flag is enabled", async () => {
    const { accessToken: adminToken } = await makeUser("admin");

    const before = await request(app).get("/api/pets");
    expect(before.status).toBe(200);

    await request(app)
      .post("/api/feature-flags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "maintenance_mode", label: "Maintenance Mode", enabled: true });

    // The middleware caches the flag for MAINTENANCE_CACHE_TTL_MS (set to
    // 50ms in tests — see tests/setup.js) rather than querying Mongo on
    // every single request; poll briefly to cross that window.
    let sawMaintenance = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app).get("/api/pets");
      if (res.status === 503) {
        sawMaintenance = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(sawMaintenance).toBe(true);
  });

  it("/api/system/health stays reachable regardless of maintenance mode", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    await request(app)
      .post("/api/feature-flags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "maintenance_mode", label: "Maintenance Mode", enabled: true });

    const res = await request(app).get("/api/system/health");
    expect(res.status).toBe(200);
  });
});

describe("Scheduled jobs", () => {
  it("running a job manually creates a ScheduledJobLog entry with triggeredBy=manual", async () => {
    const { user, accessToken: adminToken } = await makeUser("admin");

    await Session.create({
      user: user._id,
      token: "a".repeat(64),
      expiresAt: new Date(Date.now() - 1000),
      revoked: false,
    });

    const res = await request(app)
      .post("/api/scheduled-jobs/purgeExpiredSessions/run")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("success");
    expect(res.body.data.triggeredBy).toBe("manual");
    expect(res.body.data.itemsProcessed).toBeGreaterThanOrEqual(1);

    const logs = await ScheduledJobLog.find({ jobKey: "purgeExpiredSessions" });
    expect(logs).toHaveLength(1);
  });

  it("rejects running an unknown job key", async () => {
    const { accessToken: adminToken } = await makeUser("admin");

    const res = await request(app)
      .post("/api/scheduled-jobs/notARealJob/run")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("lists job history after a run", async () => {
    const { accessToken: adminToken } = await makeUser("admin");

    await request(app)
      .post("/api/scheduled-jobs/purgeExpiredSessions/run")
      .set("Authorization", `Bearer ${adminToken}`);

    const historyRes = await request(app)
      .get("/api/scheduled-jobs/purgeExpiredSessions/history")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(historyRes.body.data).toHaveLength(1);
  });
});

describe("Audit logs (standalone /api/audit-logs)", () => {
  it("is super_admin only", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const res = await request(app).get("/api/audit-logs").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it("lists audit log entries created by other mutations", async () => {
    const { accessToken: superAdminToken } = await makeUser("super_admin");
    const { accessToken: adminToken } = await makeUser("admin");

    await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Waffles", species: "Dog", gender: "Male" });

    const res = await request(app).get("/api/audit-logs").set("Authorization", `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
