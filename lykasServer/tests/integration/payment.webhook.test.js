const crypto = require("crypto");
const request = require("supertest");
const { connect, closeDatabase, clearCollections } = require("../setup");
const { buildApp } = require("../../src/server");
const User = require("../../src/models/User");
const Payment = require("../../src/models/Payment");

process.env.PAYMONGO_WEBHOOK_SECRET = "whsec_test_secret_for_integration";

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

function signWebhookBody(rawBody, { key = "te" } = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET)
    .update(`${timestamp}${rawBody}`)
    .digest("hex");
  return `t=${timestamp},${key}=${signature}`;
}

function webhookEventBody(type, checkoutSessionId) {
  return JSON.stringify({
    data: {
      id: "evt_test",
      attributes: {
        type,
        data: { id: checkoutSessionId, attributes: { checkout_session_id: checkoutSessionId, source: { type: "gcash" } } },
      },
    },
  });
}

describe("Payment webhook (§11.6 signature verification + §5.2 status transitions)", () => {
  it("rejects a webhook delivery with no signature header at all", async () => {
    const rawBody = webhookEventBody("payment.paid", "cs_doesnotmatter");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send(rawBody);

    expect(res.status).toBe(401);
  });

  it("rejects a webhook delivery with a tampered body vs. its signature", async () => {
    const rawBody = webhookEventBody("payment.paid", "cs_123");
    const signature = signWebhookBody(rawBody);
    const tamperedBody = webhookEventBody("payment.paid", "cs_456"); // different payload, old signature

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("paymongo-signature", signature)
      .send(tamperedBody);

    expect(res.status).toBe(401);
  });

  it("marks a payment as paid on a correctly-signed payment.paid event, and notifies the payer", async () => {
    const { user } = await makeUser("user");

    const payment = await Payment.create({
      paidBy: user._id,
      type: "donation",
      amount: 50000,
      paymongoPaymentId: "cs_abc123",
      status: "pending",
    });

    const rawBody = webhookEventBody("payment.paid", "cs_abc123");
    const signature = signWebhookBody(rawBody);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("paymongo-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);

    const updated = await Payment.findById(payment._id);
    expect(updated.status).toBe("paid");
    expect(updated.paidAt).toBeTruthy();
    expect(updated.paymentMethod).toBe("gcash");

    const { accessToken } = await (async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "password123" });
      return { accessToken: loginRes.body.data.accessToken };
    })();

    const unread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(unread.body.data.count).toBe(1);
  });

  it("marks a payment as failed on a payment.failed event", async () => {
    const { user } = await makeUser("user");
    const payment = await Payment.create({
      paidBy: user._id,
      type: "adoption_fee",
      amount: 150000,
      paymongoPaymentId: "cs_will_fail",
      status: "pending",
    });

    const rawBody = webhookEventBody("payment.failed", "cs_will_fail");
    const signature = signWebhookBody(rawBody);

    await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("paymongo-signature", signature)
      .send(rawBody);

    const updated = await Payment.findById(payment._id);
    expect(updated.status).toBe("failed");
  });

  it("acknowledges (200) a validly-signed webhook for an unknown payment id rather than erroring", async () => {
    const rawBody = webhookEventBody("payment.paid", "cs_never_created");
    const signature = signWebhookBody(rawBody);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("paymongo-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);
  });
});

describe("Payment access control", () => {
  it("prevents a user from viewing another user's payment", async () => {
    const { user: owner } = await makeUser("user");
    const { accessToken: strangerToken } = await makeUser("user");

    const payment = await Payment.create({
      paidBy: owner._id,
      type: "donation",
      amount: 10000,
      status: "paid",
    });

    const res = await request(app)
      .get(`/api/payments/my/${payment._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(404); // scoped query — not found for a non-owner, not a 403 leak
  });

  it("blocks a non-admin from refunding a payment", async () => {
    const { user, accessToken: userToken } = await makeUser("user");
    const payment = await Payment.create({ paidBy: user._id, type: "donation", amount: 10000, status: "paid" });

    const res = await request(app)
      .put(`/api/payments/${payment._id}/refund`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it("rejects refunding a payment that isn't in paid status", async () => {
    const { user } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");
    const payment = await Payment.create({ paidBy: user._id, type: "donation", amount: 10000, status: "pending" });

    const res = await request(app)
      .put(`/api/payments/${payment._id}/refund`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
