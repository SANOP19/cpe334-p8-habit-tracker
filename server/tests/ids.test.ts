import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { clock } from "../src/lib/clock.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie } from "./helpers/auth.js";

// Lab 6 pre-UAT correction KI-1 (Issue #59).
// Contract: D-10 / F-04 §2 check 3 (unknown goal -> 404), AC-14 (unknown template -> 422),
// F-02 publish (unknown template -> 404), NFR-05 (500 only for unexpected errors).
// Ids are PostgreSQL INT4 columns (max 2147483647). A larger id is simply an id that cannot exist,
// so it must get the same answer as any other unknown id — never a 500.
const PASSWORD = "Ids-Test-Pass-1";
const MAX_DB_INT = 2147483647;
const TOO_LARGE = [2147483648, 3000000000];

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  const cookie = sessionCookie(res);
  if (!cookie) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  return cookie;
}

describe("Lab 6 KI-1 (#59): ids outside the database integer range", () => {
  let participant: string;
  let manager: string;

  beforeEach(async () => {
    await resetDatabase();
    await createUser({ email: "p@example.test", password: PASSWORD, role: "PARTICIPANT" });
    const m = await createUser({ email: "m@example.test", password: PASSWORD, role: "PROGRAM_MANAGER" });
    await prisma.activityTemplate.create({
      data: { name: "Reading", unit: "pages", minValue: 1, maxValue: 200, status: "PUBLISHED", createdById: m.id },
    });
    participant = await loginAs("p@example.test");
    manager = await loginAs("m@example.test");
  });

  it("TEST-L6-59a: goal routes answer 404 NOT_FOUND for ids above 2147483647", async () => {
    for (const id of TOO_LARGE) {
      const calls = [
        request(app).get(`/api/goals/${id}`).set("Cookie", participant),
        request(app).get(`/api/goals/${id}/entries`).set("Cookie", participant),
        request(app).get(`/api/goals/${id}/progress`).set("Cookie", participant),
        request(app)
          .post(`/api/goals/${id}/entries`)
          .set("Cookie", participant)
          .send({ entryDate: clock.todayBangkok(), value: 5 }),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status, `${res.req.method} ${res.req.path}`).toBe(404);
        expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Goal not found." } });
      }
    }
  });

  it("TEST-L6-59b: creating a goal with templateId above 2147483647 is 422 TEMPLATE_NOT_PUBLISHED", async () => {
    for (const templateId of TOO_LARGE) {
      const res = await request(app).post("/api/goals").set("Cookie", participant).send({ templateId, dailyTarget: 5 });
      expect(res.status, String(templateId)).toBe(422);
      expect(res.body.error).toEqual({ code: "TEMPLATE_NOT_PUBLISHED", message: "This activity is not available for goals." });
    }
    expect(await prisma.goal.count()).toBe(0);
  });

  it("TEST-L6-59c: publishing a template id above 2147483647 is 404 NOT_FOUND", async () => {
    for (const id of TOO_LARGE) {
      const res = await request(app).post(`/api/templates/${id}/publish`).set("Cookie", manager);
      expect(res.status, String(id)).toBe(404);
      expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Template not found." } });
    }
  });

  it("TEST-L6-59d (control): the largest valid id 2147483647 already gets the unknown-id answers", async () => {
    const goal = await request(app).get(`/api/goals/${MAX_DB_INT}`).set("Cookie", participant);
    expect(goal.status).toBe(404);
    expect(goal.body.error.code).toBe("NOT_FOUND");

    const create = await request(app)
      .post("/api/goals")
      .set("Cookie", participant)
      .send({ templateId: MAX_DB_INT, dailyTarget: 5 });
    expect(create.status).toBe(422);
    expect(create.body.error.code).toBe("TEMPLATE_NOT_PUBLISHED");

    const publish = await request(app).post(`/api/templates/${MAX_DB_INT}/publish`).set("Cookie", manager);
    expect(publish.status).toBe(404);
    expect(publish.body.error.code).toBe("NOT_FOUND");
  });
});
