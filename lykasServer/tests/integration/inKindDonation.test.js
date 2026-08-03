const request = require("supertest");
const { connect, closeDatabase, clearCollections } = require("../setup");
const { buildApp } = require("../../src/server");
const User = require("../../src/models/User");

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

describe("In-kind donations", () => {
  it("submits a donation and lists it under the donor's own /my", async () => {
    const { accessToken: donorToken } = await makeUser("user");

    const createRes = await request(app)
      .post("/api/donations/goods")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ name: "Dog food (20kg bags)", quantity: 5, unit: "bags", dropOff: "walk_in" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("pending");

    const myRes = await request(app).get("/api/donations/goods/my").set("Authorization", `Bearer ${donorToken}`);
    expect(myRes.body.data).toHaveLength(1);
  });

  it("walks a donation through confirmed → received, stamping receivedAt", async () => {
    const { accessToken: donorToken } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");

    const createRes = await request(app)
      .post("/api/donations/goods")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ name: "Blankets", quantity: 10, unit: "pieces" });
    const donationId = createRes.body.data._id;

    await request(app)
      .patch(`/api/donations/goods/${donationId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" });

    const receivedRes = await request(app)
      .patch(`/api/donations/goods/${donationId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "received", staffNote: "Dropped off at front desk" });

    expect(receivedRes.body.data.status).toBe("received");
    expect(receivedRes.body.data.receivedAt).toBeTruthy();
    expect(receivedRes.body.data.staffNote).toBe("Dropped off at front desk");
  });

  it("soft-deletes and restores a donation", async () => {
    const { accessToken: donorToken } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");

    const createRes = await request(app)
      .post("/api/donations/goods")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ name: "Cat litter" });
    const donationId = createRes.body.data._id;

    await request(app).delete(`/api/donations/goods/${donationId}`).set("Authorization", `Bearer ${adminToken}`);

    const afterDelete = await request(app)
      .get("/api/donations/goods")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(afterDelete.body.data).toHaveLength(0);

    await request(app)
      .post(`/api/donations/goods/${donationId}/restore`)
      .set("Authorization", `Bearer ${adminToken}`);

    const afterRestore = await request(app)
      .get("/api/donations/goods")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(afterRestore.body.data).toHaveLength(1);
  });

  it("bulk-updates status across multiple donations", async () => {
    const { accessToken: donorToken } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");

    const first = await request(app)
      .post("/api/donations/goods")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ name: "Leashes" });
    const second = await request(app)
      .post("/api/donations/goods")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ name: "Collars" });

    const bulkRes = await request(app)
      .post("/api/donations/goods/bulk-status")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ids: [first.body.data._id, second.body.data._id], status: "confirmed" });

    expect(bulkRes.status).toBe(200);

    const listRes = await request(app)
      .get("/api/donations/goods?status=confirmed")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.body.data).toHaveLength(2);
  });
});
