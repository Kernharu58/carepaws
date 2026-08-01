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

async function makePet(adminToken) {
  const res = await request(app)
    .post("/api/pets")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Nugget", species: "Dog", gender: "Female", size: "Medium" });
  return res.body.data;
}

describe("Foster placement lifecycle", () => {
  it("creates a foster placement and marks the pet as Foster", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: fosterer } = await makeUser("user");
    const pet = await makePet(adminToken);

    const res = await request(app)
      .post("/api/foster")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pet: pet._id, fosterer: fosterer._id.toString(), weeklyReportsRequired: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("active");

    const petRes = await request(app).get(`/api/pets/${pet._id}`);
    expect(petRes.body.data.status).toBe("Foster");
  });

  it("tracks weekly report submissions and gates can-finalize on the requirement", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: fosterer, accessToken: fostererToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const fosterRes = await request(app)
      .post("/api/foster")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pet: pet._id, fosterer: fosterer._id.toString(), weeklyReportsRequired: 2 });
    const fosterId = fosterRes.body.data._id;

    const notReady = await request(app)
      .get(`/api/foster/${fosterId}/can-finalize`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notReady.body.data.canFinalize).toBe(false);

    await request(app)
      .post(`/api/foster/${fosterId}/reports`)
      .set("Authorization", `Bearer ${fostererToken}`)
      .send({ weekNumber: 1, appetite: "Good", energy: "Active", overallProgress: "Good" });

    await request(app)
      .post(`/api/foster/${fosterId}/reports`)
      .set("Authorization", `Bearer ${fostererToken}`)
      .send({ weekNumber: 2, appetite: "Excellent", energy: "Active", overallProgress: "Excellent" });

    const ready = await request(app)
      .get(`/api/foster/${fosterId}/can-finalize`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(ready.body.data.canFinalize).toBe(true);

    const missingRes = await request(app)
      .get(`/api/foster/${fosterId}/reports/missing`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(missingRes.body.data.missingWeeks).toEqual([]);
  });

  it("ending a foster with outcome ADOPTED finalizes the adoption on the pet record", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: fosterer } = await makeUser("user");
    const pet = await makePet(adminToken);

    const fosterRes = await request(app)
      .post("/api/foster")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pet: pet._id, fosterer: fosterer._id.toString() });

    const endRes = await request(app)
      .put(`/api/foster/${fosterRes.body.data._id}/end`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ outcome: "ADOPTED" });

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.status).toBe("completed");

    const petRes = await request(app).get(`/api/pets/${pet._id}`);
    expect(petRes.body.data.status).toBe("Adopted");
    expect(petRes.body.data.owner).toBe(fosterer._id.toString());
  });

  it("ending a foster with outcome RETURNED puts the pet back on the market", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: fosterer } = await makeUser("user");
    const pet = await makePet(adminToken);

    const fosterRes = await request(app)
      .post("/api/foster")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pet: pet._id, fosterer: fosterer._id.toString() });

    await request(app)
      .put(`/api/foster/${fosterRes.body.data._id}/end`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ outcome: "RETURNED", returnNotes: "Not a good match with resident cat" });

    const petRes = await request(app).get(`/api/pets/${pet._id}`);
    expect(petRes.body.data.status).toBe("Available");
  });

  it("blocks a stranger from viewing someone else's foster placement", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: fosterer } = await makeUser("user");
    const { accessToken: strangerToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const fosterRes = await request(app)
      .post("/api/foster")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pet: pet._id, fosterer: fosterer._id.toString() });

    const res = await request(app)
      .get(`/api/foster/${fosterRes.body.data._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
  });
});
