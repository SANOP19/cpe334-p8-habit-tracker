import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie } from "./helpers/auth.js";

// F-02 Activity Template Management — docs/sprints/sprint-1/F-02-templates.md
const PASSWORD = "Password123!";

async function loginAs(email: string, password = PASSWORD): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`Failed to sign in as ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return cookie;
}

describe("F-02 Activity Template Management", () => {
  let managerCookie: string;
  let manager2Cookie: string;
  let participantCookie: string;
  let managerId: number;
  let manager2Id: number;

  beforeEach(async () => {
    await resetDatabase();
    const mgr1 = await createUser({
      email: "manager@example.test",
      password: PASSWORD,
      role: "PROGRAM_MANAGER",
      displayName: "Manager One",
    });
    managerId = mgr1.id;

    const mgr2 = await createUser({
      email: "manager2@example.test",
      password: PASSWORD,
      role: "PROGRAM_MANAGER",
      displayName: "Manager Two",
    });
    manager2Id = mgr2.id;

    await createUser({
      email: "participant@example.test",
      password: PASSWORD,
      role: "PARTICIPANT",
      displayName: "Participant",
    });

    managerCookie = await loginAs("manager@example.test");
    manager2Cookie = await loginAs("manager2@example.test");
    participantCookie = await loginAs("participant@example.test");
  });

  it("TEST-07 (AC-07): program manager creates a draft template with valid fields (201 Created)", async () => {
    const res = await request(app)
      .post("/api/templates")
      .set("Cookie", managerCookie)
      .send({
        name: "Daily Steps",
        unit: "steps",
        minValue: 0,
        maxValue: 50000,
      });

    expect(res.status).toBe(201);
    expect(res.body.template).toMatchObject({
      id: expect.any(Number),
      name: "Daily Steps",
      unit: "steps",
      minValue: 0,
      maxValue: 50000,
      status: "DRAFT",
      createdById: managerId,
    });

    const dbTemplate = await prisma.activityTemplate.findUnique({
      where: { id: res.body.template.id },
    });
    expect(dbTemplate).not.toBeNull();
    expect(dbTemplate?.status).toBe("DRAFT");
    expect(dbTemplate?.createdById).toBe(managerId);
  });

  it("TEST-08 (AC-08): minValue >= maxValue is rejected with 422 VALIDATION_ERROR (INVALID_RANGE)", async () => {
    const equalRange = await request(app)
      .post("/api/templates")
      .set("Cookie", managerCookie)
      .send({
        name: "Broken Range Equal",
        unit: "hours",
        minValue: 10,
        maxValue: 10,
      });

    expect(equalRange.status).toBe(422);
    expect(equalRange.body.error.code).toBe("VALIDATION_ERROR");

    const invertedRange = await request(app)
      .post("/api/templates")
      .set("Cookie", managerCookie)
      .send({
        name: "Broken Range Inverted",
        unit: "hours",
        minValue: 20,
        maxValue: 10,
      });

    expect(invertedRange.status).toBe(422);
    expect(invertedRange.body.error.code).toBe("VALIDATION_ERROR");

    expect(await prisma.activityTemplate.count()).toBe(0);
  });

  it("TEST-08b (AC-08): missing required fields returns 422 VALIDATION_ERROR with field details", async () => {
    const res = await request(app)
      .post("/api/templates")
      .set("Cookie", managerCookie)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeInstanceOf(Array);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain("name");
    expect(fields).toContain("unit");
    expect(fields).toContain("minValue");
    expect(fields).toContain("maxValue");
  });

  it("TEST-09 (AC-09): participant attempting to create a template receives 403 FORBIDDEN", async () => {
    const res = await request(app)
      .post("/api/templates")
      .set("Cookie", participantCookie)
      .send({
        name: "Participant Template",
        unit: "km",
        minValue: 1,
        maxValue: 42,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await prisma.activityTemplate.count()).toBe(0);
  });

  it("TEST-10 (AC-10): program manager publishes own draft template (200 OK)", async () => {
    const template = await prisma.activityTemplate.create({
      data: {
        name: "Water Intake",
        unit: "ml",
        minValue: 0,
        maxValue: 5000,
        status: "DRAFT",
        createdById: managerId,
      },
    });

    const res = await request(app)
      .post(`/api/templates/${template.id}/publish`)
      .set("Cookie", managerCookie);

    expect(res.status).toBe(200);
    expect(res.body.template).toMatchObject({
      id: template.id,
      status: "PUBLISHED",
    });

    const updated = await prisma.activityTemplate.findUnique({ where: { id: template.id } });
    expect(updated?.status).toBe("PUBLISHED");
  });

  it("TEST-11a (AC-11): participant calls GET /api/templates and sees only PUBLISHED templates", async () => {
    await prisma.activityTemplate.createMany({
      data: [
        { name: "Draft Steps", unit: "steps", minValue: 0, maxValue: 10000, status: "DRAFT", createdById: managerId },
        { name: "Published Steps", unit: "steps", minValue: 0, maxValue: 20000, status: "PUBLISHED", createdById: managerId },
      ],
    });

    const res = await request(app)
      .get("/api/templates")
      .set("Cookie", participantCookie);

    expect(res.status).toBe(200);
    expect(res.body.templates).toBeInstanceOf(Array);
    expect(res.body.templates).toHaveLength(1);
    expect(res.body.templates[0].name).toBe("Published Steps");
    expect(res.body.templates[0].status).toBe("PUBLISHED");
  });

  it("TEST-11b (AC-11): program manager calls GET /api/templates and sees all own templates", async () => {
    await prisma.activityTemplate.createMany({
      data: [
        { name: "My Draft", unit: "pages", minValue: 1, maxValue: 100, status: "DRAFT", createdById: managerId },
        { name: "My Published", unit: "pages", minValue: 1, maxValue: 200, status: "PUBLISHED", createdById: managerId },
        { name: "Other Mgr Template", unit: "pages", minValue: 1, maxValue: 50, status: "PUBLISHED", createdById: manager2Id },
      ],
    });

    const res = await request(app)
      .get("/api/templates")
      .set("Cookie", managerCookie);

    expect(res.status).toBe(200);
    expect(res.body.templates).toBeInstanceOf(Array);
    expect(res.body.templates).toHaveLength(2);
    const names = res.body.templates.map((t: { name: string }) => t.name);
    expect(names).toContain("My Draft");
    expect(names).toContain("My Published");
    expect(names).not.toContain("Other Mgr Template");
  });

  it("TEST-30 (AC-30): manager publishing another manager's template returns 404 NOT_FOUND", async () => {
    const template = await prisma.activityTemplate.create({
      data: {
        name: "Manager 1 Secret Draft",
        unit: "km",
        minValue: 0,
        maxValue: 10,
        status: "DRAFT",
        createdById: managerId,
      },
    });

    const res = await request(app)
      .post(`/api/templates/${template.id}/publish`)
      .set("Cookie", manager2Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");

    const unchanged = await prisma.activityTemplate.findUnique({ where: { id: template.id } });
    expect(unchanged?.status).toBe("DRAFT");
  });

  it("TEST-31 (AC-31): publishing an already published template returns 409 ALREADY_PUBLISHED", async () => {
    const template = await prisma.activityTemplate.create({
      data: {
        name: "Already Published",
        unit: "hours",
        minValue: 1,
        maxValue: 8,
        status: "PUBLISHED",
        createdById: managerId,
      },
    });

    const res = await request(app)
      .post(`/api/templates/${template.id}/publish`)
      .set("Cookie", managerCookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_PUBLISHED");

    const unchanged = await prisma.activityTemplate.findUnique({ where: { id: template.id } });
    expect(unchanged?.status).toBe("PUBLISHED");
  });

  it("TEST-09b: participant calling POST /api/templates/:id/publish receives 403 FORBIDDEN", async () => {
    const template = await prisma.activityTemplate.create({
      data: {
        name: "Some Draft",
        unit: "km",
        minValue: 1,
        maxValue: 5,
        status: "DRAFT",
        createdById: managerId,
      },
    });

    const res = await request(app)
      .post(`/api/templates/${template.id}/publish`)
      .set("Cookie", participantCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
