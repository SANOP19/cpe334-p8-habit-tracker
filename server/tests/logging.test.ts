import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie } from "./helpers/auth.js";
import { clock } from "../src/lib/clock.js";

// F-04 Daily activity logging — docs/sprints/sprint-1/F-04-logging.md
const PASSWORD = "Log-Test-Pass-1";

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  return cookie;
}

const postEntry = (cookie: string, goalId: number | string, body: unknown) =>
  request(app).post(`/api/goals/${goalId}/entries`).set("Cookie", cookie).send(body as object);

const getEntries = (cookie: string, goalId: number | string) =>
  request(app).get(`/api/goals/${goalId}/entries`).set("Cookie", cookie);

describe("F-04 Daily activity logging", () => {
  let aId: number;
  let bId: number;
  let managerId: number;
  let aCookie: string;
  let bCookie: string;
  let managerCookie: string;
  let readingTemplate: { id: number };
  let steppingTemplate: { id: number };
  let aGoal: { id: number };
  let bGoal: { id: number };

  beforeEach(async () => {
    clock.reset();
    await resetDatabase();
    aId = (await createUser({ email: "a@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "A" })).id;
    bId = (await createUser({ email: "b@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "B" })).id;
    managerId = (await createUser({ email: "m@example.test", password: PASSWORD, role: "PROGRAM_MANAGER" })).id;

    aCookie = await loginAs("a@example.test");
    bCookie = await loginAs("b@example.test");
    managerCookie = await loginAs("m@example.test");

    readingTemplate = await prisma.activityTemplate.create({
      data: {
        name: "Reading",
        unit: "pages",
        minValue: 1,
        maxValue: 200,
        status: "PUBLISHED",
        createdById: managerId,
      },
    });

    steppingTemplate = await prisma.activityTemplate.create({
      data: {
        name: "Running",
        unit: "km",
        minValue: 10,
        maxValue: 50,
        status: "PUBLISHED",
        createdById: managerId,
      },
    });

    aGoal = await prisma.goal.create({
      data: { participantId: aId, templateId: readingTemplate.id, dailyTarget: 20 },
    });

    bGoal = await prisma.goal.create({
      data: { participantId: bId, templateId: readingTemplate.id, dailyTarget: 15 },
    });
  });

  afterEach(() => {
    clock.reset();
  });

  it("TEST-17 (AC-17): participant records daily activity for own goal and reads it back", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const res = await postEntry(aCookie, aGoal.id, {
      entryDate: "2026-11-14",
      value: 25.5,
      note: "Chapter 3 completed",
    });

    expect(res.status).toBe(201);
    expect(res.body.entry).toMatchObject({
      goalId: aGoal.id,
      entryDate: "2026-11-14",
      value: 25.5,
      note: "Chapter 3 completed",
    });

    const dbRow = await prisma.activityEntry.findFirst({
      where: { goalId: aGoal.id, entryDate: "2026-11-14" },
    });
    expect(dbRow).not.toBeNull();
    expect(dbRow?.value).toBe(25.5);
    expect(dbRow?.note).toBe("Chapter 3 completed");

    const listRes = await getEntries(aCookie, aGoal.id);
    expect(listRes.status).toBe(200);
    expect(listRes.body.entries).toHaveLength(1);
    expect(listRes.body.entries[0]).toMatchObject({
      goalId: aGoal.id,
      entryDate: "2026-11-14",
      value: 25.5,
      note: "Chapter 3 completed",
    });
  });

  it("TEST-18a (AC-18): boundary values value = min and value = max are accepted", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const stepGoal = await prisma.goal.create({
      data: { participantId: aId, templateId: steppingTemplate.id, dailyTarget: 25 },
    });

    const minRes = await postEntry(aCookie, stepGoal.id, { entryDate: "2026-11-13", value: 10 });
    expect(minRes.status).toBe(201);
    expect(minRes.body.entry.value).toBe(10);

    const maxRes = await postEntry(aCookie, stepGoal.id, { entryDate: "2026-11-14", value: 50 });
    expect(maxRes.status).toBe(201);
    expect(maxRes.body.entry.value).toBe(50);

    const entries = await prisma.activityEntry.findMany({ where: { goalId: stepGoal.id } });
    expect(entries).toHaveLength(2);
  });

  it("TEST-18b (AC-18): values below min or above max are rejected with 422 VALUE_OUT_OF_RANGE", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const stepGoal = await prisma.goal.create({
      data: { participantId: aId, templateId: steppingTemplate.id, dailyTarget: 25 },
    });

    const below = await postEntry(aCookie, stepGoal.id, { entryDate: "2026-11-14", value: 9.99 });
    expect(below.status).toBe(422);
    expect(below.body.error.code).toBe("VALUE_OUT_OF_RANGE");

    const above = await postEntry(aCookie, stepGoal.id, { entryDate: "2026-11-14", value: 50.01 });
    expect(above.status).toBe(422);
    expect(above.body.error.code).toBe("VALUE_OUT_OF_RANGE");

    const negative = await postEntry(aCookie, stepGoal.id, { entryDate: "2026-11-14", value: -5 });
    expect(negative.status).toBe(422);
    expect(negative.body.error.code).toBe("VALUE_OUT_OF_RANGE");

    expect(await prisma.activityEntry.count({ where: { goalId: stepGoal.id } })).toBe(0);
  });

  it("TEST-18c (AC-18): non-numeric values and malformed dates return 422 VALIDATION_ERROR", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const cases = [
      [{ entryDate: "2026-11-14", value: "25" }, "value"],
      [{ entryDate: "2026-11-14", value: true }, "value"],
      [{ entryDate: "2026-11-14" }, "value"],
      [{ value: 25 }, "entryDate"],
      [{ entryDate: "not-a-date", value: 25 }, "entryDate"],
      [{ entryDate: "2026-02-31", value: 25 }, "entryDate"],
    ];

    for (const [body, field] of cases) {
      const res = await postEntry(aCookie, aGoal.id, body);
      expect(res.status, JSON.stringify(body)).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    }

    expect(await prisma.activityEntry.count()).toBe(0);
  });

  it("TEST-19 (AC-19): future date in Asia/Bangkok is rejected with 422 DATE_IN_FUTURE", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00"); // Today in Bangkok: 2026-11-14
    const res = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-15", value: 20 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("DATE_IN_FUTURE");
    expect(res.body.error.message).toContain("future");
    expect(await prisma.activityEntry.count()).toBe(0);
  });

  it("TEST-19b (NFR-09): midnight crossing proves Asia/Bangkok is used instead of UTC", async () => {
    // 2026-11-14T17:30:00Z is 2026-11-14 in UTC, but 00:30 on 2026-11-15 in Asia/Bangkok (UTC+7)
    clock.setMock("2026-11-14T17:30:00Z");

    // Today in Bangkok (15 Nov) -> 201
    const todayRes = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-15", value: 20 });
    expect(todayRes.status).toBe(201);
    expect(todayRes.body.entry.entryDate).toBe("2026-11-15");

    // Tomorrow in Bangkok (16 Nov) -> 422 DATE_IN_FUTURE
    const tomorrowRes = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-16", value: 20 });
    expect(tomorrowRes.status).toBe(422);
    expect(tomorrowRes.body.error.code).toBe("DATE_IN_FUTURE");

    // 6 days ago in Bangkok (9 Nov) -> 201
    const sixDaysAgoRes = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-09", value: 20 });
    expect(sixDaysAgoRes.status).toBe(201);
    expect(sixDaysAgoRes.body.entry.entryDate).toBe("2026-11-09");

    // 7 days ago in Bangkok (8 Nov) -> 422 DATE_TOO_OLD
    const sevenDaysAgoRes = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-08", value: 20 });
    expect(sevenDaysAgoRes.status).toBe(422);
    expect(sevenDaysAgoRes.body.error.code).toBe("DATE_TOO_OLD");
  });

  it("TEST-20 (AC-20): 6 days ago is accepted; 7 days ago is rejected with 422 DATE_TOO_OLD", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00"); // Today is 2026-11-14

    // 6 days ago: 2026-11-08 -> accepted
    const validPast = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-08", value: 20 });
    expect(validPast.status).toBe(201);
    expect(validPast.body.entry.entryDate).toBe("2026-11-08");

    // 7 days ago: 2026-11-07 -> rejected
    const tooOld = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-07", value: 20 });
    expect(tooOld.status).toBe(422);
    expect(tooOld.body.error.code).toBe("DATE_TOO_OLD");
    expect(tooOld.body.error.message).toContain("6 days");

    const stored = await prisma.activityEntry.findMany({ where: { goalId: aGoal.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].entryDate).toBe("2026-11-08");
  });

  it("TEST-21 (AC-21): second entry for same goal and day returns 409 DUPLICATE_ENTRY", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const first = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-14", value: 20 });
    expect(first.status).toBe(201);

    const dup = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-14", value: 30 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("DUPLICATE_ENTRY");

    const stored = await prisma.activityEntry.findMany({ where: { goalId: aGoal.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].value).toBe(20);
  });

  it("TEST-22 (AC-22 / NFR-10): two simultaneous submissions store exactly one row and return 409 for the second", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");

    // Repeat across multiple dates to thoroughly exercise concurrency
    const testDates = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"];
    for (const d of testDates) {
      const [r1, r2] = await Promise.all([
        postEntry(aCookie, aGoal.id, { entryDate: d, value: 20 }),
        postEntry(aCookie, aGoal.id, { entryDate: d, value: 30 }),
      ]);

      const statuses = [r1.status, r2.status].sort();
      expect(statuses, `Race condition on date ${d}`).toEqual([201, 409]);

      const conflict = r1.status === 409 ? r1 : r2;
      expect(conflict.body.error.code).toBe("DUPLICATE_ENTRY");

      const count = await prisma.activityEntry.count({ where: { goalId: aGoal.id, entryDate: d } });
      expect(count).toBe(1);
    }
  });

  it("TEST-23 (AC-23): participant cannot record or read entries for another participant's goal", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");

    // Participant A tries to post to B's goal
    const postRes = await postEntry(aCookie, bGoal.id, { entryDate: "2026-11-14", value: 15 });
    expect(postRes.status).toBe(404);
    expect(postRes.body.error.code).toBe("NOT_FOUND");

    // Participant A tries to read B's goal entries
    const getRes = await getEntries(aCookie, bGoal.id);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe("NOT_FOUND");

    // Non-numeric goal id
    const invalidId = await postEntry(aCookie, "xyz", { entryDate: "2026-11-14", value: 15 });
    expect(invalidId.status).toBe(404);
    expect(invalidId.body.error.code).toBe("NOT_FOUND");

    expect(await prisma.activityEntry.count()).toBe(0);
  });

  it("TEST-MGR: program manager cannot record or read goal entries", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const postRes = await postEntry(managerCookie, aGoal.id, { entryDate: "2026-11-14", value: 20 });
    expect(postRes.status).toBe(403);
    expect(postRes.body.error.code).toBe("FORBIDDEN");

    const getRes = await getEntries(managerCookie, aGoal.id);
    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe("FORBIDDEN");
  });

  it("TEST-28 (AC-28): activity entries persist across database reconnect / restart", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const postRes = await postEntry(aCookie, aGoal.id, {
      entryDate: "2026-11-14",
      value: 42,
      note: "Persisted record",
    });
    expect(postRes.status).toBe(201);

    // Simulate restart by disconnecting and reconnecting Prisma
    await prisma.$disconnect();
    await prisma.$connect();

    const readRes = await getEntries(aCookie, aGoal.id);
    expect(readRes.status).toBe(200);
    expect(readRes.body.entries).toHaveLength(1);
    expect(readRes.body.entries[0]).toMatchObject({
      goalId: aGoal.id,
      entryDate: "2026-11-14",
      value: 42,
      note: "Persisted record",
    });
  });

  it("TEST-L6-62 (#62, F-04 §1): a note longer than 500 characters is 422 VALIDATION_ERROR on note", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    const long = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-14", value: 20, note: "n".repeat(501) });
    expect(long.status).toBe(422);
    expect(long.body.error.code).toBe("VALIDATION_ERROR");
    expect(long.body.error.details).toContainEqual({ field: "note", message: "Must be at most 500 characters" });
    expect(await prisma.activityEntry.count()).toBe(0);

    // Exactly 500 characters after trimming is accepted; surrounding spaces are not counted or stored.
    const atLimit = await postEntry(aCookie, aGoal.id, {
      entryDate: "2026-11-14",
      value: 20,
      note: `  ${"n".repeat(500)}  `,
    });
    expect(atLimit.status).toBe(201);
    expect(atLimit.body.entry.note).toHaveLength(500);
  });

  it("TEST-L6-63 (#63, F-04 §2): a note that is not text is 422 VALIDATION_ERROR on note; null still means no note", async () => {
    clock.setMock("2026-11-14T12:00:00+07:00");
    for (const note of [123, true, { text: "x" }, ["x"]]) {
      const res = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-14", value: 20, note });
      expect(res.status, JSON.stringify(note)).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toContainEqual({ field: "note", message: "Must be text" });
    }
    expect(await prisma.activityEntry.count()).toBe(0);

    // Control: null (and an omitted note) are still accepted as "no note".
    const none = await postEntry(aCookie, aGoal.id, { entryDate: "2026-11-14", value: 20, note: null });
    expect(none.status).toBe(201);
    expect(none.body.entry.note).toBeNull();
  });
});
