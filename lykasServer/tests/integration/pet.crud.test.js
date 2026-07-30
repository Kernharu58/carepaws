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

async function makeUser(overrides = {}) {
  const user = await User.create({
    displayName: overrides.displayName || "Test User",
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
    role: overrides.role || "user",
    emailVerified: true,
  });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: "password123" });

  return { user, accessToken: loginRes.body.data.accessToken };
}

const samplePet = {
  name: "Biscuit",
  species: "Dog",
  breed: "Shih Tzu Mix",
  gender: "Male",
  size: "Small",
  temperament: "Playful",
  energyLevel: "Medium",
  description: "A very good boy.",
};

describe("Pet catalog + admin CRUD", () => {
  it("returns an empty list from the public catalog when no pets exist", async () => {
    const res = await request(app).get("/api/pets");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it("rejects pet creation from a non-admin user", async () => {
    const { accessToken } = await makeUser({ role: "user" });

    const res = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(samplePet);

    expect(res.status).toBe(403);
  });

  it("rejects pet creation with an invalid enum value", async () => {
    const { accessToken } = await makeUser({ role: "admin" });

    const res = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...samplePet, species: "Dragon" });

    expect(res.status).toBe(400);
  });

  it("lets an admin create a pet, and it appears in the public catalog", async () => {
    const { accessToken } = await makeUser({ role: "admin" });

    const createRes = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(samplePet);

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("Available");

    const listRes = await request(app).get("/api/pets");
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].name).toBe("Biscuit");
  });

  it("filters the public catalog by species and supports free-text search", async () => {
    const { accessToken } = await makeUser({ role: "admin" });
    await request(app).post("/api/pets").set("Authorization", `Bearer ${accessToken}`).send(samplePet);
    await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...samplePet, name: "Whiskers", species: "Cat", gender: "Female" });

    const dogOnly = await request(app).get("/api/pets?species=Dog");
    expect(dogOnly.body.data).toHaveLength(1);
    expect(dogOnly.body.data[0].species).toBe("Dog");

    const searchRes = await request(app).get("/api/pets?q=Whiskers");
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].name).toBe("Whiskers");
  });

  it("supports the full soft-delete → restore → permanent-delete lifecycle", async () => {
    const { accessToken: adminToken } = await makeUser({ role: "admin" });
    const { accessToken: superAdminToken } = await makeUser({ role: "super_admin" });

    const createRes = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(samplePet);
    const petId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/pets/${petId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    // No longer visible in the public catalog once soft-deleted.
    const publicListAfterDelete = await request(app).get("/api/pets");
    expect(publicListAfterDelete.body.data).toHaveLength(0);

    // But still visible to admins via the admin list with includeDeleted=true.
    const adminList = await request(app)
      .get("/api/pets/admin?includeDeleted=true")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.body.data).toHaveLength(1);
    expect(adminList.body.data[0].isDeleted).toBe(true);

    // A regular admin (not super_admin) cannot permanently delete.
    const forbiddenPermDelete = await request(app)
      .delete(`/api/pets/${petId}/permanent`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(forbiddenPermDelete.status).toBe(403);

    const restoreRes = await request(app)
      .post(`/api/pets/${petId}/restore`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.isDeleted).toBe(false);

    const permDeleteRes = await request(app)
      .delete(`/api/pets/${petId}/permanent`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(permDeleteRes.status).toBe(200);

    const getAfterPermDelete = await request(app).get(`/api/pets/${petId}`);
    expect(getAfterPermDelete.status).toBe(404);
  });

  it("finalizes an adoption and rejects adopting an already-adopted pet", async () => {
    const { accessToken: adminToken } = await makeUser({ role: "admin" });
    const { user: adopter } = await makeUser({ role: "user" });

    const createRes = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(samplePet);
    const petId = createRes.body.data._id;

    const adoptRes = await request(app)
      .post(`/api/pets/${petId}/adopt`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: adopter._id.toString() });

    expect(adoptRes.status).toBe(200);
    expect(adoptRes.body.data.status).toBe("Adopted");
    expect(adoptRes.body.data.owner).toBe(adopter._id.toString());

    const secondAdoptRes = await request(app)
      .post(`/api/pets/${petId}/adopt`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: adopter._id.toString() });

    expect(secondAdoptRes.status).toBe(400);
  });

  it("lists a user's own adopted pets via /my-pets", async () => {
    const { accessToken: adminToken } = await makeUser({ role: "admin" });
    const { user: adopter, accessToken: adopterToken } = await makeUser({ role: "user" });

    const createRes = await request(app)
      .post("/api/pets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(samplePet);

    await request(app)
      .post(`/api/pets/${createRes.body.data._id}/adopt`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: adopter._id.toString() });

    const myPetsRes = await request(app)
      .get("/api/pets/my-pets")
      .set("Authorization", `Bearer ${adopterToken}`);

    expect(myPetsRes.status).toBe(200);
    expect(myPetsRes.body.data).toHaveLength(1);
    expect(myPetsRes.body.data[0].name).toBe("Biscuit");
  });
});
