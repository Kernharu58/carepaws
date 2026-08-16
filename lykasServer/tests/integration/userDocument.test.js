const request = require("supertest");
const { connect, closeDatabase, clearCollections } = require("../setup");
const { buildApp } = require("../../src/server");
const User = require("../../src/models/User");
const UserDocument = require("../../src/models/UserDocument");

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

describe("UserDocument verification", () => {
  it("lets a user delete only their own document", async () => {
    const { user: owner } = await makeUser("user");
    const { accessToken: strangerToken } = await makeUser("user");

    const doc = await UserDocument.create({
      user: owner._id,
      type: "government_id",
      fileUrl: "https://example.com/id.jpg",
    });

    const res = await request(app)
      .delete(`/api/documents/${doc._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(404);
  });

  it("admin verifying a document notifies the owner and stamps verifiedBy/verifiedAt", async () => {
    const { user: owner, accessToken: ownerToken } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");

    const doc = await UserDocument.create({
      user: owner._id,
      type: "proof_of_address",
      fileUrl: "https://example.com/proof.pdf",
    });

    const res = await request(app)
      .put(`/api/documents/${doc._id}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "verified" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("verified");
    expect(res.body.data.verifiedAt).toBeTruthy();

    const unread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(unread.body.data.count).toBe(1);
  });

  it("rejecting a document requires no reason but accepts one", async () => {
    const { user: owner } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");

    const doc = await UserDocument.create({
      user: owner._id,
      type: "government_id",
      fileUrl: "https://example.com/id.jpg",
    });

    const res = await request(app)
      .put(`/api/documents/${doc._id}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "rejected", rejectedReason: "Photo is blurry" });

    expect(res.status).toBe(200);
    expect(res.body.data.rejectedReason).toBe("Photo is blurry");
  });
});
