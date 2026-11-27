import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { calculateProgress } from "../src/lib/progress.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie } from "./helpers/auth.js";

// F-05 Progress and privacy isolation — docs/sprints/sprint-1/F-05-progress-privacy.md
const PASSWORD = "Progress-Test-Pass-1";

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  return cookie;
}

describe("TEST-24a (AC-24): calculateProgress", () => {
  it("calculates truncated, uncapped percentages and achieved flags", () => {
    const result = calculateProgress(20, [
      { entryDate: "2026-11-14", value: 25 },
      { entryDate: "2026-11-13", value: 10 },
      { entryDate: "2026-11-12", value: 20 },
      { entryDate: "2026-11-11", value: 19.99 },
    ]);

    expect(result.days).toEqual([
      { entryDate: "2026-11-14", value: 25, percent: 125, achieved: true },
      { entryDate: "2026-11-13", value: 10, percent: 50, achieved: false },
      { entryDate: "2026-11-12", value: 20, percent: 100, achieved: true },
      { entryDate: "2026-11-11", value: 19.99, percent: 99.9, achieved: false },
    ]);
    expect(result.entriesCount).toBe(4);
    expect(result.achievedCount).toBe(2);
  });

  it("truncates to one decimal place (1 of 3 is 33.3) and orders days newest first", () => {
    const result = calculateProgress(3, [
      { entryDate: "2026-11-10", value: 1 },
      { entryDate: "2026-11-12", value: 3 },
    ]);
    expect(result.days.map((d) => [d.entryDate, d.percent])).toEqual([
      ["2026-11-12", 100],
      ["2026-11-10", 33.3],
    ]);
  });

  it("returns zero counts and no days when there are no entries", () => {
    expect(calculateProgress(20, [])).toEqual({ entriesCount: 0, achievedCount: 0, days: [] });
  });
});

describe("F-05 progress API and privacy", () => {
  let aCookie: string;
  let bCookie: string;
  let managerCookie: string;
  let aGoalId: number;
  let bGoalId: number;

  beforeEach(async () => {
    await resetDatabase();
    const a = await createUser({ email: "a@example.test", password: PASSWORD, role: "PARTICIPANT" });
    const b = await createUser({ email: "b@example.test", password: PASSWORD, role: "PARTICIPANT" });
    const m = await createUser({ email: "m@example.test", password: PASSWORD, role: "PROGRAM_MANAGER" });
    aCookie = await loginAs("a@example.test");
    bCookie = await loginAs("b@example.test");
    managerCookie = await loginAs("m@example.test");

    const t = await prisma.activityTemplate.create({
      data: { name: "Reading", unit: "pages", minValue: 1, maxValue: 200, status: "PUBLISHED", createdById: m.id },
    });
    aGoalId = (await prisma.goal.create({ data: { participantId: a.id, templateId: t.id, dailyTarget: 20 } })).id;
    bGoalId = (await prisma.goal.create({ data: { participantId: b.id, templateId: t.id, dailyTarget: 30 } })).id;
    await prisma.activityEntry.createMany({
      data: [
        { goalId: aGoalId, entryDate: "2026-11-14", value: 25 },
        { goalId: aGoalId, entryDate: "2026-11-13", value: 10 },
        { goalId: aGoalId, entryDate: "2026-11-12", value: 20 },
        { goalId: bGoalId, entryDate: "2026-11-14", value: 77.7, note: "B-private-note" },
      ],
    });
  });

  it("TEST-24b (AC-24): progress endpoint returns per-day percentages and counts for the owner", async () => {
    const res = await request(app).get(`/api/goals/${aGoalId}/progress`).set("Cookie", aCookie);

    expect(res.status).toBe(200);
    expect(res.body.progress).toEqual({
      goalId: aGoalId,
      dailyTarget: 20,
      unit: "pages",
      entriesCount: 3,
      achievedCount: 2,
      days: [
        { entryDate: "2026-11-14", value: 25, percent: 125, achieved: true },
        { entryDate: "2026-11-13", value: 10, percent: 50, achieved: false },
        { entryDate: "2026-11-12", value: 20, percent: 100, achieved: true },
      ],
    });
  });

  it("TEST-24c (AC-24): a goal with no entries has empty progress", async () => {
    await prisma.activityEntry.deleteMany({ where: { goalId: aGoalId } });
    const res = await request(app).get(`/api/goals/${aGoalId}/progress`).set("Cookie", aCookie);

    expect(res.status).toBe(200);
    expect(res.body.progress).toMatchObject({ entriesCount: 0, achievedCount: 0, days: [] });
  });

  it("TEST-25 (AC-25): a participant reads their own progress but gets 404 for another participant's goal, entries and progress", async () => {
    // Positive control: without this, "404" would also pass when the route does not exist.
    const own = await request(app).get(`/api/goals/${aGoalId}/progress`).set("Cookie", aCookie);
    expect(own.status).toBe(200);

    for (const path of [`/api/goals/${bGoalId}`, `/api/goals/${bGoalId}/entries`, `/api/goals/${bGoalId}/progress`, "/api/goals/abc/progress"]) {
      const res = await request(app).get(path).set("Cookie", aCookie);
      expect(res.status, path).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.text).not.toContain("77.7");
      expect(res.text).not.toContain("B-private-note");
    }
  });

  it("TEST-26 (AC-26): the owner reads their progress but a program manager gets 403 for goal, entries and progress", async () => {
    const own = await request(app).get(`/api/goals/${aGoalId}/progress`).set("Cookie", aCookie);
    expect(own.status).toBe(200);

    for (const path of [`/api/goals/${aGoalId}`, `/api/goals/${aGoalId}/entries`, `/api/goals/${aGoalId}/progress`]) {
      const res = await request(app).get(path).set("Cookie", managerCookie);
      expect(res.status, path).toBe(403);
      expect(res.body).toEqual({ error: { code: "FORBIDDEN", message: "You do not have permission to do this." } });
    }
  });

  it("TEST-29 (AC-29): every kind of error has the same safe body", async () => {
    const dupGoalTemplate = (await prisma.goal.findUnique({ where: { id: aGoalId } }))!.templateId;
    const responses = {
      "401": await request(app).get("/api/auth/me"),
      "403": await request(app).get("/api/goals").set("Cookie", managerCookie),
      "404": await request(app).get(`/api/goals/${bGoalId}`).set("Cookie", aCookie),
      "409": await request(app).post("/api/goals").set("Cookie", aCookie).send({ templateId: dupGoalTemplate, dailyTarget: 5 }),
      "422": await request(app).post("/api/goals").set("Cookie", bCookie).send({ dailyTarget: "x" }),
      malformed: await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{ not json"),
      unknownRoute: await request(app).get("/api/does-not-exist"),
      "500": await request(app).get("/api/test/unexpected-error"),
    };
    const expectedStatus: Record<string, number> = {
      "401": 401, "403": 403, "404": 404, "409": 409, "422": 422, malformed: 422, unknownRoute: 404, "500": 500,
    };

    for (const [kind, res] of Object.entries(responses)) {
      expect(res.status, kind).toBe(expectedStatus[kind]);
      expect(Object.keys(res.body), kind).toEqual(["error"]);
      const keys = Object.keys(res.body.error).sort();
      expect(keys.filter((k) => k !== "details"), kind).toEqual(["code", "message"]);
      expect(typeof res.body.error.code, kind).toBe("string");
      expect(typeof res.body.error.message, kind).toBe("string");
      for (const leak of ["stack", "    at ", "prisma", "P20", "SELECT", "/src/", "\\src\\", "Simulated"]) {
        expect(res.text.toLowerCase(), `${kind} leaks ${leak}`).not.toContain(leak.toLowerCase());
      }
    }
  });
});

// Lab 6 Part D, Issue #87 (PT finding EXP-02): F-05 §1.2 / D-08 — the percentage is truncated to one decimal and
// is never 100% unless the target is met. A value just below the target must not be rounded up to 100, and the
// same truncation must hold at every 0.1 step; floating-point noise (e.g. 0.3 / 0.1) must still give whole steps.
describe("TEST-L6-87 (AC-24, Issue #87): truncation near a 0.1 step", () => {
  it("never shows 100% for a value below the target (PT's 9.99999999999 of 10)", () => {
    const days = calculateProgress(10, [
      { entryDate: "2026-11-25", value: 9.99999999999 },
      { entryDate: "2026-11-24", value: 9.99999999999999 },
    ]).days;
    expect(days).toEqual([
      { entryDate: "2026-11-25", value: 9.99999999999, percent: 99.9, achieved: false },
      { entryDate: "2026-11-24", value: 9.99999999999999, percent: 99.9, achieved: false },
    ]);
    expect(calculateProgress(20, [{ entryDate: "2026-11-25", value: 19.99999999999 }]).days[0]).toMatchObject({
      percent: 99.9,
      achieved: false,
    });
  });

  it("truncates (does not round up) just below any other 0.1 step", () => {
    expect(calculateProgress(1, [{ entryDate: "2026-11-25", value: 0.49999999999995 }]).days[0].percent).toBe(49.9);
    expect(calculateProgress(10, [{ entryDate: "2026-11-25", value: 12.499999999999 }]).days[0].percent).toBe(124.9);
  });

  it("still gives whole steps despite floating-point noise", () => {
    const pct = (dailyTarget: number, value: number) =>
      calculateProgress(dailyTarget, [{ entryDate: "2026-11-25", value }]).days[0];
    expect(pct(0.1, 0.3)).toMatchObject({ percent: 300, achieved: true });
    expect(pct(0.1, 0.7)).toMatchObject({ percent: 700, achieved: true });
    expect(pct(0.3, 0.1 * 3)).toMatchObject({ percent: 100, achieved: true });
    expect(pct(0.3, 0.3)).toMatchObject({ percent: 100, achieved: true });
    expect(pct(3, 1)).toMatchObject({ percent: 33.3, achieved: false });
    expect(pct(20, 19.99)).toMatchObject({ percent: 99.9, achieved: false });
  });

  it("the progress endpoint returns 99.9 and not achieved for 9.99999999999 of 10", async () => {
    await resetDatabase();
    const p = await createUser({ email: "p87@example.test", password: PASSWORD, role: "PARTICIPANT" });
    const m = await createUser({ email: "m87@example.test", password: PASSWORD, role: "PROGRAM_MANAGER" });
    const cookie = await loginAs("p87@example.test");
    const t = await prisma.activityTemplate.create({
      data: { name: "Water", unit: "liters", minValue: 0.5, maxValue: 10.5, status: "PUBLISHED", createdById: m.id },
    });
    const goalId = (await prisma.goal.create({ data: { participantId: p.id, templateId: t.id, dailyTarget: 10 } })).id;
    await prisma.activityEntry.create({ data: { goalId, entryDate: "2026-11-25", value: 9.99999999999 } });

    const res = await request(app).get(`/api/goals/${goalId}/progress`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.progress).toMatchObject({
      entriesCount: 1,
      achievedCount: 0,
      days: [{ entryDate: "2026-11-25", value: 9.99999999999, percent: 99.9, achieved: false }],
    });
  });
});
