import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie } from "./helpers/auth.js";
import { clock } from "../src/lib/clock.js";

// Lab 7 change request #99 — entry correction with revision history.
// Contract: docs/sprints/sprint-1/F-04-logging.md v1.2 §1.7, §2, §5 (AC-34..AC-38), §6 (TEST-34a..TEST-38d).
// Revisions are read only through the API, so these tests need no database model that the
// pre-change code does not have.
const PASSWORD = "Correction-Test-Pass-1";
const NOON_14_NOV = "2026-11-14T12:00:00+07:00";

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  return cookie;
}

const postEntry = (cookie: string, goalId: number, body: object) =>
  request(app).post(`/api/goals/${goalId}/entries`).set("Cookie", cookie).send(body);

const patchEntry = (cookie: string | null, goalId: number | string, entryId: number | string, body: unknown) => {
  const req = request(app).patch(`/api/goals/${goalId}/entries/${entryId}`);
  if (cookie) req.set("Cookie", cookie);
  return req.send(body as object);
};

const getRevisions = (cookie: string | null, goalId: number | string, entryId: number | string) => {
  const req = request(app).get(`/api/goals/${goalId}/entries/${entryId}/revisions`);
  if (cookie) req.set("Cookie", cookie);
  return req;
};

const getEntries = (cookie: string, goalId: number) =>
  request(app).get(`/api/goals/${goalId}/entries`).set("Cookie", cookie);

const getProgress = (cookie: string, goalId: number) =>
  request(app).get(`/api/goals/${goalId}/progress`).set("Cookie", cookie);

describe("Lab 7 CR #99 — entry correction with revision history (F-04 v1.2)", () => {
  let aId: number;
  let bId: number;
  let managerId: number;
  let aCookie: string;
  let bCookie: string;
  let managerCookie: string;
  let pagesTemplateId: number;
  let aGoalId: number;

  async function createEntry(entryDate: string, value: number, note?: string): Promise<{ id: number }> {
    const res = await postEntry(aCookie, aGoalId, note === undefined ? { entryDate, value } : { entryDate, value, note });
    expect(res.status, `POST ${entryDate}`).toBe(201);
    return res.body.entry;
  }

  async function entryState(goalId: number, entryId: number) {
    const entries = await getEntries(aCookie, goalId);
    const entry = entries.body.entries.find((e: { id: number }) => e.id === entryId);
    const revisions = await getRevisions(aCookie, goalId, entryId);
    return { entry, revisions: revisions.body.revisions };
  }

  beforeEach(async () => {
    clock.reset();
    await resetDatabase();
    aId = (await createUser({ email: "a@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "A" })).id;
    bId = (await createUser({ email: "b@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "B" })).id;
    managerId = (await createUser({ email: "m@example.test", password: PASSWORD, role: "PROGRAM_MANAGER" })).id;
    aCookie = await loginAs("a@example.test");
    bCookie = await loginAs("b@example.test");
    managerCookie = await loginAs("m@example.test");

    pagesTemplateId = (
      await prisma.activityTemplate.create({
        data: { name: "Reading", unit: "pages", minValue: 10, maxValue: 50, status: "PUBLISHED", createdById: managerId },
      })
    ).id;
    aGoalId = (await prisma.goal.create({ data: { participantId: aId, templateId: pagesTemplateId, dailyTarget: 20 } })).id;
    await prisma.goal.create({ data: { participantId: bId, templateId: pagesTemplateId, dailyTarget: 20 } });
  });

  afterEach(() => {
    clock.reset();
  });

  it("TEST-34a (AC-34): the owner corrects value and note with a reason; a revision is stored and readable", async () => {
    clock.setMock(NOON_14_NOV);
    const post = await postEntry(aCookie, aGoalId, { entryDate: "2026-11-14", value: 15 });
    expect(post.status).toBe(201);
    expect(post.body.entry.version).toBe(0);
    expect(post.body.entry.updatedAt).toBeNull();
    const entryId = post.body.entry.id;
    const createdAt = post.body.entry.createdAt;

    const before = await getRevisions(aCookie, aGoalId, entryId);
    expect(before.status).toBe(200);
    expect(before.body.revisions).toEqual([]);

    const res = await patchEntry(aCookie, aGoalId, entryId, { value: 25, note: "fixed", reason: "typo", version: 0 });
    expect(res.status).toBe(200);
    expect(res.body.entry).toMatchObject({
      id: entryId,
      goalId: aGoalId,
      entryDate: "2026-11-14",
      value: 25,
      note: "fixed",
      createdAt,
      version: 1,
    });
    expect(typeof res.body.entry.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(res.body.entry.updatedAt))).toBe(false);
    expect(res.body.revision).toMatchObject({
      previousValue: 15,
      newValue: 25,
      previousNote: null,
      newNote: "fixed",
      reason: "typo",
    });

    const list = await getEntries(aCookie, aGoalId);
    expect(list.body.entries).toHaveLength(1);
    expect(list.body.entries[0]).toMatchObject({ id: entryId, value: 25, note: "fixed", entryDate: "2026-11-14", createdAt, version: 1 });

    const after = await getRevisions(aCookie, aGoalId, entryId);
    expect(after.status).toBe(200);
    expect(after.body.revisions).toHaveLength(1);
    expect(after.body.revisions[0]).toMatchObject({ previousValue: 15, newValue: 25, previousNote: null, newNote: "fixed", reason: "typo" });
    expect(after.body.revisions[0]).not.toHaveProperty("changedById");
    expect(await prisma.activityEntry.count({ where: { goalId: aGoalId } })).toBe(1);
  });

  it("TEST-34b (AC-34): a second correction gives version 2 and two revisions, newest first", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-14", 15);
    const first = await patchEntry(aCookie, aGoalId, entry.id, { value: 25, note: "fixed", reason: "typo", version: 0 });
    expect(first.status).toBe(200);

    clock.setMock("2026-11-14T13:00:00+07:00");
    const second = await patchEntry(aCookie, aGoalId, entry.id, { value: 30, reason: "again", version: 1 });
    expect(second.status).toBe(200);
    expect(second.body.entry).toMatchObject({ value: 30, note: "fixed", version: 2 });

    const revisions = await getRevisions(aCookie, aGoalId, entry.id);
    expect(revisions.status).toBe(200);
    expect(revisions.body.revisions).toHaveLength(2);
    expect(revisions.body.revisions[0]).toMatchObject({ previousValue: 25, newValue: 30, previousNote: "fixed", newNote: "fixed", reason: "again" });
    expect(revisions.body.revisions[1]).toMatchObject({ previousValue: 15, newValue: 25, previousNote: null, newNote: "fixed", reason: "typo" });
    expect(Date.parse(revisions.body.revisions[0].changedAt)).toBeGreaterThan(Date.parse(revisions.body.revisions[1].changedAt));
  });

  it("TEST-35a (AC-35): an entry 6 days old can be corrected; 7 days old is locked", async () => {
    clock.setMock("2026-11-13T12:00:00+07:00"); // 07 Nov is still inside the window on 13 Nov
    const old = await createEntry("2026-11-07", 15);
    clock.setMock(NOON_14_NOV);
    const sixDays = await createEntry("2026-11-08", 15);

    const ok = await patchEntry(aCookie, aGoalId, sixDays.id, { value: 20, reason: "fix", version: 0 });
    expect(ok.status).toBe(200);
    expect(ok.body.entry.version).toBe(1);

    const locked = await patchEntry(aCookie, aGoalId, old.id, { value: 20, reason: "fix", version: 0 });
    expect(locked.status).toBe(422);
    expect(locked.body.error).toEqual({
      code: "ENTRY_LOCKED",
      message: "Only entries from today and the past 6 days can be corrected.",
    });
    const state = await entryState(aGoalId, old.id);
    expect(state.entry).toMatchObject({ value: 15, version: 0, updatedAt: null });
    expect(state.revisions).toEqual([]);
  });

  it("TEST-35b (AC-35, NFR-09): the lock moves at midnight in Asia/Bangkok, not UTC", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-08", 15);

    clock.setMock("2026-11-14T16:59:59Z"); // 23:59:59 on 14 Nov in Bangkok
    const before = await patchEntry(aCookie, aGoalId, entry.id, { value: 20, reason: "before midnight", version: 0 });
    expect(before.status).toBe(200);

    clock.setMock("2026-11-14T17:00:00Z"); // 00:00:00 on 15 Nov in Bangkok (still 14 Nov in UTC)
    const after = await patchEntry(aCookie, aGoalId, entry.id, { value: 25, reason: "after midnight", version: 1 });
    expect(after.status).toBe(422);
    expect(after.body.error.code).toBe("ENTRY_LOCKED");
    const state = await entryState(aGoalId, entry.id);
    expect(state.entry).toMatchObject({ value: 20, version: 1 });
    expect(state.revisions).toHaveLength(1);
  });

  it("TEST-36 (AC-36): invalid corrections are rejected with 422 and change nothing", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-14", 15, "orig");
    let version = 0;
    let expected = { value: 15, note: "orig" as string | null };
    let revisionCount = 0;

    const accept = async (body: Record<string, unknown>, value: number, note: string | null, label: string) => {
      const res = await patchEntry(aCookie, aGoalId, entry.id, { ...body, version });
      expect(res.status, label).toBe(200);
      version += 1;
      revisionCount += 1;
      expected = { value, note };
      expect(res.body.entry, label).toMatchObject({ value, note, version });
    };

    const reject = async (body: unknown, code: string, field: string | null, label: string) => {
      const res = await patchEntry(aCookie, aGoalId, entry.id, body);
      expect(res.status, label).toBe(422);
      expect(res.body.error.code, label).toBe(code);
      if (field) {
        expect(res.body.error.details.map((d: { field: string }) => d.field), label).toContain(field);
      }
      const state = await entryState(aGoalId, entry.id);
      expect(state.entry, label).toMatchObject({ ...expected, version });
      expect(state.revisions, label).toHaveLength(revisionCount);
    };

    // Accepted boundaries
    await accept({ value: 10, reason: "min" }, 10, "orig", "value = min");
    await accept({ value: 50, reason: "max" }, 50, "orig", "value = max");
    await accept({ note: "n".repeat(500), reason: "r".repeat(200) }, 50, "n".repeat(500), "500-char note, 200-char reason");
    await accept({ note: "", reason: "clear note" }, 50, null, "empty note clears it");

    // Rejected
    await reject({ value: 9.99, reason: "x", version }, "VALUE_OUT_OF_RANGE", null, "value below min");
    await reject({ value: 50.01, reason: "x", version }, "VALUE_OUT_OF_RANGE", null, "value above max");
    await reject({ value: "25", reason: "x", version }, "VALIDATION_ERROR", "value", "value as string");
    await reject({ entryDate: "2026-11-13", value: 20, reason: "x", version }, "VALIDATION_ERROR", "entryDate", "entryDate present");
    await reject({ reason: "x", version }, "VALIDATION_ERROR", "body", "neither value nor note");
    await reject({ note: "n".repeat(501), reason: "x", version }, "VALIDATION_ERROR", "note", "501-char note");
    await reject({ note: 5, reason: "x", version }, "VALIDATION_ERROR", "note", "note not text");
    await reject({ value: 20, version }, "VALIDATION_ERROR", "reason", "reason missing");
    await reject({ value: 20, reason: "", version }, "VALIDATION_ERROR", "reason", "reason empty");
    await reject({ value: 20, reason: "   ", version }, "VALIDATION_ERROR", "reason", "reason blank");
    await reject({ value: 20, reason: "r".repeat(201), version }, "VALIDATION_ERROR", "reason", "201-char reason");
    await reject({ value: 20, reason: "x", version: -1 }, "VALIDATION_ERROR", "version", "version negative");
    await reject({ value: 20, reason: "x", version: 1.5 }, "VALIDATION_ERROR", "version", "version not whole");
    await reject({ value: 20, reason: "x" }, "VALIDATION_ERROR", "version", "version missing");
    await reject({ value: 50, note: null, reason: "same", version }, "NO_CHANGE", null, "no change");
  });

  it("TEST-37 (AC-37): both routes reject other users, managers and unknown entries without changes", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-14", 15);
    const otherTemplateId = (
      await prisma.activityTemplate.create({
        data: { name: "Walking", unit: "km", minValue: 0, maxValue: 30, status: "PUBLISHED", createdById: managerId },
      })
    ).id;
    const aSecondGoalId = (await prisma.goal.create({ data: { participantId: aId, templateId: otherTemplateId, dailyTarget: 5 } })).id;
    const body = { value: 20, reason: "x", version: 0 };

    const anon = await patchEntry(null, aGoalId, entry.id, body);
    expect(anon.status).toBe(401);
    expect((await getRevisions(null, aGoalId, entry.id)).status).toBe(401);

    const mgr = await patchEntry(managerCookie, aGoalId, entry.id, body);
    expect(mgr.status).toBe(403);
    expect((await getRevisions(managerCookie, aGoalId, entry.id)).status).toBe(403);

    for (const res of [await patchEntry(bCookie, aGoalId, entry.id, body), await getRevisions(bCookie, aGoalId, entry.id)]) {
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({ code: "NOT_FOUND", message: "Goal not found." });
    }

    for (const res of [
      await patchEntry(aCookie, aSecondGoalId, entry.id, body),
      await getRevisions(aCookie, aSecondGoalId, entry.id),
      await patchEntry(aCookie, aGoalId, 2147483648, body),
      await getRevisions(aCookie, aGoalId, 2147483648),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({ code: "NOT_FOUND", message: "Entry not found." });
    }

    const state = await entryState(aGoalId, entry.id);
    expect(state.entry).toMatchObject({ value: 15, version: 0, updatedAt: null });
    expect(state.revisions).toEqual([]);
  });

  it("TEST-38a (AC-38): progress follows the corrected value", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-14", 10);

    const before = await getProgress(aCookie, aGoalId);
    expect(before.body.progress).toMatchObject({ entriesCount: 1, achievedCount: 0 });
    expect(before.body.progress.days[0]).toMatchObject({ entryDate: "2026-11-14", value: 10, percent: 50, achieved: false });

    const res = await patchEntry(aCookie, aGoalId, entry.id, { value: 20, reason: "typo", version: 0 });
    expect(res.status).toBe(200);

    const after = await getProgress(aCookie, aGoalId);
    expect(after.body.progress).toMatchObject({ entriesCount: 1, achievedCount: 1 });
    expect(after.body.progress.days[0]).toMatchObject({ entryDate: "2026-11-14", value: 20, percent: 100, achieved: true });
  });

  it("TEST-38b (AC-38): a correction based on an out-of-date version is rejected with 409", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-14", 15);
    expect((await patchEntry(aCookie, aGoalId, entry.id, { value: 25, reason: "first", version: 0 })).status).toBe(200);

    const stale = await patchEntry(aCookie, aGoalId, entry.id, { value: 30, reason: "stale tab", version: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toEqual({
      code: "STALE_ENTRY",
      message: "This entry was changed elsewhere. Reload it and try again.",
    });
    const state = await entryState(aGoalId, entry.id);
    expect(state.entry).toMatchObject({ value: 25, version: 1 });
    expect(state.revisions).toHaveLength(1);
  });

  it("TEST-38c (AC-38, NFR-10): of two simultaneous corrections of the same version exactly one wins (5 rounds)", async () => {
    clock.setMock(NOON_14_NOV);
    const entry = await createEntry("2026-11-14", 15);

    for (let round = 0; round < 5; round++) {
      const [r1, r2] = await Promise.all([
        patchEntry(aCookie, aGoalId, entry.id, { value: 20 + round, reason: `tab 1, round ${round}`, version: round }),
        patchEntry(aCookie, aGoalId, entry.id, { value: 30 + round, reason: `tab 2, round ${round}`, version: round }),
      ]);
      expect([r1.status, r2.status].sort(), `round ${round}`).toEqual([200, 409]);
      const loser = r1.status === 409 ? r1 : r2;
      expect(loser.body.error.code, `round ${round}`).toBe("STALE_ENTRY");
    }

    const state = await entryState(aGoalId, entry.id);
    expect(state.entry.version).toBe(5);
    expect(state.revisions).toHaveLength(5);
    expect(await prisma.activityEntry.count({ where: { goalId: aGoalId } })).toBe(1);
  });

  it("TEST-38d (AC-38): for every entry the number of revisions equals its version; rejected requests add none", async () => {
    clock.setMock(NOON_14_NOV);
    const e1 = await createEntry("2026-11-14", 15);
    const e2 = await createEntry("2026-11-12", 15, "two");
    clock.setMock("2026-11-13T12:00:00+07:00");
    const e3 = await createEntry("2026-11-07", 15); // locked again once the clock is back on 14 Nov
    clock.setMock(NOON_14_NOV);

    await patchEntry(aCookie, aGoalId, e1.id, { value: 20, reason: "a", version: 0 }); // accepted
    await patchEntry(aCookie, aGoalId, e1.id, { value: 21, reason: "b", version: 1 }); // accepted
    await patchEntry(aCookie, aGoalId, e1.id, { value: 22, reason: "stale", version: 0 }); // 409
    await patchEntry(aCookie, aGoalId, e2.id, { note: "two", reason: "same", version: 0 }); // 422 NO_CHANGE
    await patchEntry(aCookie, aGoalId, e2.id, { value: 99, reason: "range", version: 0 }); // 422 range
    await patchEntry(aCookie, aGoalId, e2.id, { value: 16, reason: "c", version: 0 }); // accepted
    await patchEntry(aCookie, aGoalId, e3.id, { value: 16, reason: "locked", version: 0 }); // 422 locked

    const list = await getEntries(aCookie, aGoalId);
    const versions: Record<number, number> = {};
    for (const e of list.body.entries) versions[e.id] = e.version;
    expect(versions).toEqual({ [e1.id]: 2, [e2.id]: 1, [e3.id]: 0 });

    for (const e of list.body.entries) {
      const revisions = await getRevisions(aCookie, aGoalId, e.id);
      expect(revisions.status).toBe(200);
      expect(revisions.body.revisions, `entry ${e.entryDate}`).toHaveLength(e.version);
    }
  });
});
