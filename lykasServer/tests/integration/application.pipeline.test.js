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

async function makePet(adminToken, overrides = {}) {
  const res = await request(app)
    .post("/api/pets")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Biscuit",
      species: "Dog",
      gender: "Male",
      size: "Small",
      ...overrides,
    });
  return res.body.data;
}

describe("Application pipeline: submit → stage transitions → approve/reject", () => {
  it("lets a user submit an application, and puts the pet on hold", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id, phone: "555-0100", householdSize: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.stage).toBe("submitted");

    const petRes = await request(app).get(`/api/pets/${pet._id}`);
    expect(petRes.body.data.status).toBe("Pending");
  });

  it("rejects a second pending application for the same pet by the same user", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    await request(app).post("/api/applications").set("Authorization", `Bearer ${userToken}`).send({ pet: pet._id });
    const secondRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });

    expect(secondRes.status).toBe(400);
  });

  it("hides internalNotes from the applicant but shows them to staff", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const createRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });
    const appId = createRes.body.data._id;

    await request(app)
      .post(`/api/applications/${appId}/notes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "Applicant seemed very prepared." });

    const asApplicant = await request(app)
      .get(`/api/applications/${appId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(asApplicant.body.data.internalNotes).toBeUndefined();

    const asStaff = await request(app)
      .get(`/api/applications/${appId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(asStaff.body.data.internalNotes).toHaveLength(1);
  });

  it("blocks a different user from viewing someone else's application", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const { accessToken: otherUserToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const createRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });

    const res = await request(app)
      .get(`/api/applications/${createRes.body.data._id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
  });

  it("walks an application through stage transitions and records stageHistory", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const createRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });
    const appId = createRes.body.data._id;

    for (const stage of ["document_review", "interview", "home_visit", "risk_assessment"]) {
      const res = await request(app)
        .put(`/api/applications/${appId}/stage`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stage, note: `moved to ${stage}` });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe(stage);
    }

    const historyRes = await request(app)
      .get(`/api/applications/${appId}/history`)
      .set("Authorization", `Bearer ${adminToken}`);

    // submitted (on create) + 4 explicit transitions
    expect(historyRes.body.data).toHaveLength(5);
  });

  it("releases the pet hold when an application is rejected", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken } = await makeUser("user");
    const pet = await makePet(adminToken);

    const createRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });

    await request(app)
      .put(`/api/applications/${createRes.body.data._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "rejected" });

    const petRes = await request(app).get(`/api/pets/${pet._id}`);
    expect(petRes.body.data.status).toBe("Available");
  });

  it("computes totalScore/riskLevel server-side, ignoring any client-supplied values", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { accessToken: userToken, user: applicant } = await makeUser("user");
    const pet = await makePet(adminToken);

    const createRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id });

    const raRes = await request(app)
      .post("/api/risk-assessments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        application: createRes.body.data._id,
        applicant: applicant._id.toString(),
        pet: pet._id,
        scores: {
          housingStability: 5,
          financialReadiness: 5,
          petExperience: 5,
          lifestyleMatch: 5,
          familyCommitment: 5,
          knowledgeOfPet: 5,
        },
        // Attempting to smuggle a fake score/level through — should be ignored,
        // and rejected outright by the strict schema for extra safety.
        totalScore: 999,
        riskLevel: "Low",
      });

    // The schema is .strict(), so unknown fields (totalScore/riskLevel) 400.
    expect(raRes.status).toBe(400);

    const cleanRes = await request(app)
      .post("/api/risk-assessments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        application: createRes.body.data._id,
        applicant: applicant._id.toString(),
        pet: pet._id,
        scores: {
          housingStability: 1,
          financialReadiness: 1,
          petExperience: 1,
          lifestyleMatch: 1,
          familyCommitment: 1,
          knowledgeOfPet: 1,
        },
      });

    expect(cleanRes.status).toBe(201);
    expect(cleanRes.body.data.totalScore).toBe(6);
    expect(cleanRes.body.data.riskLevel).toBe("High");
  });

  it("lets staff record a walk-in application on behalf of a named applicant", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: walkInApplicant } = await makeUser("user");
    const pet = await makePet(adminToken);

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pet: pet._id, applicant: walkInApplicant._id.toString(), phone: "555-0199" });

    expect(res.status).toBe(201);
    expect(res.body.data.applicant).toBe(walkInApplicant._id.toString());
  });

  it("ignores a client-supplied applicant field from a regular (non-staff) user", async () => {
    const { accessToken: adminToken } = await makeUser("admin");
    const { user: submittingUser, accessToken: userToken } = await makeUser("user");
    const { user: someoneElse } = await makeUser("user");
    const pet = await makePet(adminToken);

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ pet: pet._id, applicant: someoneElse._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.applicant).toBe(submittingUser._id.toString());
  });
});
