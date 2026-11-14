import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie } from "./helpers/auth.js";

// F-03 Goal setting — docs/sprints/sprint-1/F-03-goals.md
const PASSWORD = "Goal-Test-Pass-1";

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  return cookie;
}

async function template(opts: { name: string; min: number; max: number; status?: "DRAFT" | "PUBLISHED"; ownerId: number }) {
  return prisma.activityTemplate.create({
    data: {
      name: opts.name,
      unit: "pages",
      minValue: opts.min,
      maxValue: opts.max,
      status: opts.status ?? "PUBLISHED",
      createdById: opts.ownerId,
    },
  });
}

const postGoal = (cookie: string, body: unknown) =>
  request(app).post("/api/goals").set("Cookie", cookie).send(body as object);

describe("F-03 Goal setting", () => {
  let aId: number;
  let bId: number;
  let managerId: number;
  let aCookie: string;
  let bCookie: string;
  let managerCookie: string;
  let reading: { id: number };

  beforeEach(async () => {
    await resetDatabase();
    aId = (await createUser({ email: "a@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "A" })).id;
    bId = (await createUser({ email: "b@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "B" })).id;
    managerId = (await createUser({ email: "m@example.test", password: PASSWORD, role: "PROGRAM_MANAGER" })).id;
    aCookie = await loginAs("a@example.test");
    bCookie = await loginAs("b@example.test");
    managerCookie = await loginAs("m@example.test");
    reading = await template({ name: "Reading", min: 1, max: 200, ownerId: managerId });
  });

  it("TEST-12 (AC-12): participant creates an ACTIVE goal owned by the caller, even if the body names another user", async () => {
    const res = await postGoal(aCookie, { templateId: reading.id, dailyTarget: 20, participantId: bId, status: "ARCHIVED" });

    expect(res.status).toBe(201);
    expect(res.body.goal).toMatchObject({
      templateId: reading.id,
      dailyTarget: 20,
      status: "ACTIVE",
      template: { id: reading.id, name: "Reading", unit: "pages", minValue: 1, maxValue: 200 },
    });
    const rows = await prisma.goal.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].participantId).toBe(aId);
    expect(rows[0].status).toBe("ACTIVE");

    const list = await request(app).get("/api/goals").set("Cookie", aCookie);
    expect(list.status).toBe(200);
    expect(list.body.goals.map((g: { id: number }) => g.id)).toEqual([res.body.goal.id]);
  });

  it("TEST-13a (AC-13): targets equal to min and max are accepted; below, above and negative are rejected", async () => {
    const second = await template({ name: "Reading 2", min: 1, max: 200, ownerId: managerId });

    expect((await postGoal(aCookie, { templateId: reading.id, dailyTarget: 1 })).status).toBe(201);
    expect((await postGoal(aCookie, { templateId: second.id, dailyTarget: 200 })).status).toBe(201);

    const third = await template({ name: "Reading 3", min: 1, max: 200, ownerId: managerId });
    for (const dailyTarget of [0.5, 200.5, -5]) {
      const res = await postGoal(aCookie, { templateId: third.id, dailyTarget });
      expect(res.status, `target ${dailyTarget}`).toBe(422);
      expect(res.body.error.code).toBe("TARGET_OUT_OF_RANGE");
      expect(res.body.error.message).toContain("pages");
    }
    expect(await prisma.goal.count()).toBe(2);
  });

  it("TEST-13b (AC-13): a target of 0 is rejected even when the range starts at 0; 0.1 is accepted", async () => {
    const zeroBased = await template({ name: "Walking", min: 0, max: 30, ownerId: managerId });

    const zero = await postGoal(aCookie, { templateId: zeroBased.id, dailyTarget: 0 });
    expect(zero.status).toBe(422);
    expect(zero.body.error.code).toBe("TARGET_OUT_OF_RANGE");

    const small = await postGoal(aCookie, { templateId: zeroBased.id, dailyTarget: 0.1 });
    expect(small.status).toBe(201);
  });

  it("TEST-13c (AC-13): non-number target or invalid templateId is a 422 VALIDATION_ERROR", async () => {
    const cases: Array<[unknown, string]> = [
      [{ templateId: reading.id, dailyTarget: "10" }, "dailyTarget"],
      [{ templateId: reading.id, dailyTarget: true }, "dailyTarget"],
      [{ templateId: reading.id }, "dailyTarget"],
      [{ dailyTarget: 10 }, "templateId"],
      [{ templateId: "x", dailyTarget: 10 }, "templateId"],
      [{ templateId: 1.5, dailyTarget: 10 }, "templateId"],
    ];
    for (const [body, field] of cases) {
      const res = await postGoal(aCookie, body);
      expect(res.status, JSON.stringify(body)).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    }
    expect(await prisma.goal.count()).toBe(0);
  });

  it("TEST-14 (AC-14): draft or unknown template is rejected with TEMPLATE_NOT_PUBLISHED", async () => {
    const draft = await template({ name: "Draft", min: 1, max: 10, status: "DRAFT", ownerId: managerId });

    for (const templateId of [draft.id, 999999]) {
      const res = await postGoal(aCookie, { templateId, dailyTarget: 5 });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("TEMPLATE_NOT_PUBLISHED");
    }
    expect(await prisma.goal.count()).toBe(0);
  });

  it("TEST-15a (AC-15): a second active goal on the same template is 409; other templates and other participants are fine", async () => {
    const other = await template({ name: "Study", min: 10, max: 600, ownerId: managerId });
    expect((await postGoal(aCookie, { templateId: reading.id, dailyTarget: 20 })).status).toBe(201);

    const dup = await postGoal(aCookie, { templateId: reading.id, dailyTarget: 30 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("DUPLICATE_ACTIVE_GOAL");

    expect((await postGoal(aCookie, { templateId: other.id, dailyTarget: 60 })).status).toBe(201);
    expect((await postGoal(bCookie, { templateId: reading.id, dailyTarget: 15 })).status).toBe(201);

    expect(await prisma.goal.count({ where: { participantId: aId, templateId: reading.id } })).toBe(1);
  });

  it("TEST-15b (AC-15): two simultaneous requests for the same template store exactly one goal", async () => {
    const [first, second] = await Promise.all([
      postGoal(aCookie, { templateId: reading.id, dailyTarget: 20 }),
      postGoal(aCookie, { templateId: reading.id, dailyTarget: 25 }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const conflict = first.status === 409 ? first : second;
    expect(conflict.body.error.code).toBe("DUPLICATE_ACTIVE_GOAL");
    expect(await prisma.goal.count()).toBe(1);
  });

  it("TEST-16 (AC-16): program manager cannot create a goal", async () => {
    const res = await postGoal(managerCookie, { templateId: reading.id, dailyTarget: 20 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await prisma.goal.count()).toBe(0);
  });

  it("TEST-32 (AC-32): program manager cannot read goals", async () => {
    const created = await postGoal(aCookie, { templateId: reading.id, dailyTarget: 20 });

    for (const path of ["/api/goals", `/api/goals/${created.body.goal.id}`]) {
      const res = await request(app).get(path).set("Cookie", managerCookie);
      expect(res.status, path).toBe(403);
      expect(res.body).toEqual({ error: { code: "FORBIDDEN", message: "You do not have permission to do this." } });
    }
  });

  it("TEST-G1 (BR-05): participants see only their own goals; another participant's goal is 404", async () => {
    const aGoal = (await postGoal(aCookie, { templateId: reading.id, dailyTarget: 20 })).body.goal;
    const bGoal = (await postGoal(bCookie, { templateId: reading.id, dailyTarget: 15 })).body.goal;

    const list = await request(app).get("/api/goals").set("Cookie", aCookie);
    expect(list.body.goals.map((g: { id: number }) => g.id)).toEqual([aGoal.id]);

    const own = await request(app).get(`/api/goals/${aGoal.id}`).set("Cookie", aCookie);
    expect(own.status).toBe(200);
    expect(own.body.goal.id).toBe(aGoal.id);

    for (const path of [`/api/goals/${bGoal.id}`, "/api/goals/abc"]) {
      const res = await request(app).get(path).set("Cookie", aCookie);
      expect(res.status, path).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    }
  });
});
