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

describe("Event registration", () => {
  it("registers a user for an event and increments currentAttendees", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Adoption Drive", date: new Date(Date.now() + 7 * 86400000).toISOString(), maxAttendees: 1 });
    const eventId = eventRes.body.data._id;

    const regRes = await request(app)
      .post(`/api/events/${eventId}/register`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(regRes.status).toBe(201);

    const eventAfter = await request(app).get(`/api/events/${eventId}`);
    expect(eventAfter.body.data.currentAttendees).toBe(1);
  });

  it("rejects registering twice, and rejects registering once the event is full", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const { accessToken: secondUserToken } = await makeUser("user");

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Small Workshop", date: new Date(Date.now() + 7 * 86400000).toISOString(), maxAttendees: 1 });
    const eventId = eventRes.body.data._id;

    await request(app).post(`/api/events/${eventId}/register`).set("Authorization", `Bearer ${userToken}`);

    const dupeRes = await request(app)
      .post(`/api/events/${eventId}/register`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(dupeRes.status).toBe(400);

    const fullRes = await request(app)
      .post(`/api/events/${eventId}/register`)
      .set("Authorization", `Bearer ${secondUserToken}`);
    expect(fullRes.status).toBe(400);
  });

  it("unregistering decrements currentAttendees and frees a spot", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const { accessToken: secondUserToken } = await makeUser("user");

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Popular Event", date: new Date(Date.now() + 7 * 86400000).toISOString(), maxAttendees: 1 });
    const eventId = eventRes.body.data._id;

    await request(app).post(`/api/events/${eventId}/register`).set("Authorization", `Bearer ${userToken}`);
    await request(app).delete(`/api/events/${eventId}/register`).set("Authorization", `Bearer ${userToken}`);

    const secondRegRes = await request(app)
      .post(`/api/events/${eventId}/register`)
      .set("Authorization", `Bearer ${secondUserToken}`);
    expect(secondRegRes.status).toBe(201);
  });
});

describe("Volunteer registration and event assignment", () => {
  it("registers a volunteer, approves them, and assigns them to an event", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: volunteerToken } = await makeUser("user");

    const registerRes = await request(app)
      .post("/api/volunteers/register")
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ motivation: "I love animals", availability: ["Weekends"] });
    expect(registerRes.status).toBe(201);
    const volunteerId = registerRes.body.data._id;

    const approveRes = await request(app)
      .put(`/api/volunteers/${volunteerId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved" });
    expect(approveRes.body.data.status).toBe("approved");

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Fundraiser Gala", date: new Date(Date.now() + 14 * 86400000).toISOString() });

    const assignRes = await request(app)
      .post(`/api/events/${eventRes.body.data._id}/volunteers`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ volunteer: volunteerId, role: "Check-in table" });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.status).toBe("assigned");
  });

  it("logging hours updates both the volunteer's and the user's totals", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: volunteerUser, accessToken: volunteerToken } = await makeUser("user");

    const registerRes = await request(app)
      .post("/api/volunteers/register")
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ motivation: "Here to help" });
    const volunteerId = registerRes.body.data._id;

    await request(app)
      .post(`/api/volunteers/${volunteerId}/hours`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ hours: 3.5 });

    const volunteerRes = await request(app)
      .get(`/api/volunteers/${volunteerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(volunteerRes.body.data.totalHours).toBe(3.5);

    const meRes = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${volunteerToken}`);
    expect(meRes.body.data.user.volunteerHours).toBe(3.5);
  });
});
