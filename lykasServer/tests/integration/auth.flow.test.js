const request = require("supertest");
const { connect, closeDatabase, clearCollections } = require("../setup");
const { buildApp } = require("../../src/server");

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

const credentials = {
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct-horse-battery-staple",
};

describe("Auth flow: register → verify → login → lockout → reset", () => {
  it("registers a new account and reports emailSkipped since no transport is configured", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.emailSkipped).toBe(true);
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.emailVerified).toBe(false);
  });

  it("rejects a second registration with the same email", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects registration payloads that fail validation", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ displayName: "A", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown fields on the register payload (zod .strict())", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...credentials, role: "super_admin" });

    expect(res.status).toBe(400);
  });

  it("verifies the email with the dev-echoed token, then allows login", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(credentials);
    const { devVerificationToken } = registerRes.body;

    const verifyRes = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: devVerificationToken });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
    expect(loginRes.body.data.refreshToken).toBeDefined();
    expect(loginRes.body.data.user.email).toBe(credentials.email);
  });

  it("rejects login with the wrong password", async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("locks the account after 5 consecutive failed login attempts", async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const attempt = () =>
      request(app).post("/api/auth/login").send({ email: credentials.email, password: "wrong" });

    for (let i = 0; i < 4; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }

    // 5th attempt crosses the threshold and locks the account.
    const fifth = await attempt();
    expect(fifth.status).toBe(423);

    // Even the correct password is now rejected while locked.
    const correctButLocked = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    expect(correctButLocked.status).toBe(423);
  });

  it("lets a locked-out user recover via forgot/reset password, then log in again", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").send({ email: credentials.email, password: "wrong" });
    }

    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: credentials.email });
    expect(forgotRes.status).toBe(200);
    const { devResetToken } = forgotRes.body;
    expect(devResetToken).toBeDefined();

    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: devResetToken, newPassword: "a-brand-new-password" });
    expect(resetRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: "a-brand-new-password" });
    expect(loginRes.status).toBe(200);
  });

  it("does not reveal whether an email exists on forgot-password", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account exists/i);
  });

  it("rejects /me without a token and accepts it with a valid one", async () => {
    const noAuth = await request(app).get("/api/auth/me");
    expect(noAuth.status).toBe(401);

    await request(app).post("/api/auth/register").send(credentials);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(credentials.email);
  });

  it("rotates the refresh token and rejects reuse of the old one", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    const oldRefreshToken = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: oldRefreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(oldRefreshToken);

    const reuseRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: oldRefreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it("blacklists the access token on logout so it can't be reused", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    const { accessToken } = loginRes.body.data;

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(meRes.status).toBe(401);
  });
});
