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
    .send({ name: "Pixel", species: "Cat", gender: "Female", size: "Small" });
  return res.body.data;
}

describe("Notifications", () => {
  it("notifies the applicant when their application is approved", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });

    await request(app)
      .put(`/api/applications/${appRes.body.data._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });

    const unreadRes = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${userToken}`);
    expect(unreadRes.body.data.count).toBe(1);

    const myRes = await request(app).get("/api/notifications/my").set("Authorization", `Bearer ${userToken}`);
    expect(myRes.body.data).toHaveLength(1);
    expect(myRes.body.data[0].type).toBe("APPLICATION_APPROVED");
  });

  it("does not notify on a reset back to pending", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });

    await request(app)
      .put(`/api/applications/${appRes.body.data._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "pending" });

    const unreadRes = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${userToken}`);
    expect(unreadRes.body.data.count).toBe(0);
  });

  it("admin can broadcast a notification to explicit recipients", async () => {
    const { accessToken: adminToken } = await makeUser("admin");

    const sendRes = await request(app)
      .post("/api/notifications/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        recipients: [(await makeUser("user")).user._id.toString()],
        type: "GENERAL",
        title: "Welcome",
        message: "Thanks for joining CarePaws!",
      });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.sent).toBe(1);
  });

  it("mark-all-read clears the unread count", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user, accessToken: userToken } = await makeUser("user");

    await request(app)
      .post("/api/notifications/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ recipients: [user._id.toString()], type: "GENERAL", title: "A", message: "a" });
    await request(app)
      .post("/api/notifications/send")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ recipients: [user._id.toString()], type: "GENERAL", title: "B", message: "b" });

    let unread = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${userToken}`);
    expect(unread.body.data.count).toBe(2);

    await request(app).put("/api/notifications/read-all").set("Authorization", `Bearer ${userToken}`);

    unread = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${userToken}`);
    expect(unread.body.data.count).toBe(0);
  });
});

describe("Notes", () => {
  it("rejects an invalid entityType", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const pet = await makePet(adminToken);

    const res = await request(app)
      .post(`/api/notes/NotAValidType/${pet._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "hello" });

    expect(res.status).toBe(400);
  });

  it("attaches and lists a note on a Pet", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const pet = await makePet(adminToken);

    await request(app)
      .post(`/api/notes/Pet/${pet._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "Loves belly rubs" });

    const res = await request(app)
      .get(`/api/notes/Pet/${pet._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].text).toBe("Loves belly rubs");
  });
});
