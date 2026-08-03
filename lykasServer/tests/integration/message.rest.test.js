const request = require("supertest");
const { connect, closeDatabase, clearCollections } = require("../setup");
const { buildApp } = require("../../src/server");
const User = require("../../src/models/User");
const Message = require("../../src/models/Message");

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

describe("Message REST fallback (§4 correction — extracted from server.js)", () => {
  it("returns a conversation's full history, oldest-first, to its owner", async () => {
    const { user, accessToken: userToken } = await makeUser("user");

    await Message.create({ userId: user._id, sender: "user", text: "Hi, is Biscuit still available?" });
    await Message.create({ userId: user._id, sender: "shelter", text: "Yes! Want to schedule a visit?" });

    const res = await request(app)
      .get(`/api/messages/${user._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].text).toBe("Hi, is Biscuit still available?");
    expect(res.body.data[1].sender).toBe("shelter");
  });

  it("blocks a different user from reading someone else's conversation", async () => {
    const { user: owner } = await makeUser("user");
    const { accessToken: strangerToken } = await makeUser("user");

    await Message.create({ userId: owner._id, sender: "user", text: "private message" });

    const res = await request(app)
      .get(`/api/messages/${owner._id}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
  });

  it("lets staff read any conversation", async () => {
    const { user: owner } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");

    await Message.create({ userId: owner._id, sender: "user", text: "hello" });

    const res = await request(app)
      .get(`/api/messages/${owner._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("chat-sessions lists conversations most-recent-first, staff-only", async () => {
    const { user: userA } = await makeUser("user");
    const { user: userB } = await makeUser("user");
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");

    await Message.create({ userId: userA._id, sender: "user", text: "older" });
    await new Promise((r) => setTimeout(r, 10));
    await Message.create({ userId: userB._id, sender: "user", text: "newer" });

    const forbidden = await request(app).get("/api/chat-sessions").set("Authorization", `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app).get("/api/chat-sessions").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].lastMessage).toBe("newer");
  });
});
