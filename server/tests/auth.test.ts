import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { seedDatabase } from "../prisma/seed.js";
import { resetDatabase } from "./harness.js";
import { createUser, sessionCookie, sessionCookieLine, tokenOf } from "./helpers/auth.js";

// F-01 Authentication and session — docs/sprints/sprint-1/F-01-auth.md
const PASSWORD = "Correct-Horse-1";

// Every protected endpoint. Later feature PRs add their endpoints here (AC-04).
const PROTECTED_ENDPOINTS: Array<{ method: "get" | "post"; path: string }> = [
  { method: "get", path: "/api/auth/me" },
  { method: "post", path: "/api/auth/logout" },
  { method: "get", path: "/api/templates" },
  { method: "post", path: "/api/templates" },
  { method: "post", path: "/api/templates/1/publish" },
  { method: "get", path: "/api/goals" },
  { method: "post", path: "/api/goals" },
  { method: "get", path: "/api/goals/1" },
];

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function signIn(email: string, password = PASSWORD) {
  return request(app).post("/api/auth/login").send({ email, password });
}

describe("F-01 Authentication and session", () => {
  beforeEach(async () => {
    await resetDatabase();
    await createUser({ email: "alex@example.test", password: PASSWORD, role: "PARTICIPANT", displayName: "Alex" });
    await createUser({ email: "morgan@example.test", password: PASSWORD, role: "PROGRAM_MANAGER", displayName: "Morgan" });
  });

  it("TEST-01 (AC-01): valid sign-in returns the user, sets an HttpOnly session cookie and stores only the token hash", async () => {
    const res = await signIn("alex@example.test");

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      email: "alex@example.test",
      displayName: "Alex",
      role: "PARTICIPANT",
    });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const line = sessionCookieLine(res);
    expect(line).toBeDefined();
    expect(line).toMatch(/HttpOnly/i);
    expect(line).toMatch(/SameSite=Lax/i);

    const token = tokenOf(sessionCookie(res)!);
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).toBe(sha256(token));
    expect(sessions[0].tokenHash).not.toBe(token);
    const hoursLeft = (sessions[0].expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(23.9);
    expect(hoursLeft).toBeLessThanOrEqual(24);
  });

  it("TEST-01 (AC-01): email is matched case-insensitively", async () => {
    const res = await signIn("  ALEX@Example.Test ");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("alex@example.test");
  });

  it("TEST-02a/b (AC-02): wrong password and unknown email get the same 401 and create no session", async () => {
    const wrongPassword = await signIn("alex@example.test", "wrong-password");
    const unknownEmail = await signIn("nobody@example.test");

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." },
      });
      expect(sessionCookie(res)).toBeUndefined();
    }
    expect(await prisma.session.count()).toBe(0);
  });

  it("TEST-02c (AC-02): missing email or password is a 422 validation error", async () => {
    const noEmail = await request(app).post("/api/auth/login").send({ password: PASSWORD });
    const noPassword = await request(app).post("/api/auth/login").send({ email: "alex@example.test" });

    expect(noEmail.status).toBe(422);
    expect(noEmail.body.error.code).toBe("VALIDATION_ERROR");
    expect(noEmail.body.error.details).toContainEqual({ field: "email", message: "Required" });
    expect(noPassword.status).toBe(422);
    expect(noPassword.body.error.details).toContainEqual({ field: "password", message: "Required" });
    expect(await prisma.session.count()).toBe(0);
  });

  it("TEST-03 (AC-03): /me returns the identity of each session's own user", async () => {
    const alexCookie = sessionCookie(await signIn("alex@example.test"))!;
    const morganCookie = sessionCookie(await signIn("morgan@example.test"))!;

    const alex = await request(app).get("/api/auth/me").set("Cookie", alexCookie);
    const morgan = await request(app).get("/api/auth/me").set("Cookie", morganCookie);

    expect(alex.status).toBe(200);
    expect(alex.body.user).toMatchObject({ email: "alex@example.test", role: "PARTICIPANT" });
    expect(morgan.status).toBe(200);
    expect(morgan.body.user).toMatchObject({ email: "morgan@example.test", role: "PROGRAM_MANAGER" });
  });

  it("TEST-04 (AC-04): every protected endpoint rejects a missing or unknown session with 401 and no data", async () => {
    for (const { method, path } of PROTECTED_ENDPOINTS) {
      for (const cookie of [undefined, "session=not-a-real-token"]) {
        const req = request(app)[method](path);
        const res = cookie ? await req.set("Cookie", cookie) : await req;
        expect(res.status, `${method.toUpperCase()} ${path} cookie=${cookie}`).toBe(401);
        expect(res.body).toEqual({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
      }
    }
  });

  it("TEST-05 (AC-05): sign-out deletes the session, clears the cookie and the old cookie stops working", async () => {
    const cookie = sessionCookie(await signIn("alex@example.test"))!;

    const out = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(204);
    expect(sessionCookieLine(out)).toMatch(/session=;/);
    expect(sessionCookieLine(out)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect(await prisma.session.count()).toBe(0);

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(401);

    const again = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(again.status).toBe(401);
  });

  it("TEST-05 (AC-05): signing out one session does not end another session of the same user", async () => {
    const first = sessionCookie(await signIn("alex@example.test"))!;
    const second = sessionCookie(await signIn("alex@example.test"))!;

    await request(app).post("/api/auth/logout").set("Cookie", first);

    expect((await request(app).get("/api/auth/me").set("Cookie", first)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Cookie", second)).status).toBe(200);
  });

  it("TEST-06 (AC-06): seeded passwords are stored as bcrypt hashes and the seed password signs in", async () => {
    await resetDatabase();
    process.env.SEED_MANAGER_PASSWORD = "Seed-Manager-Pass-1";
    process.env.SEED_PARTICIPANT_PASSWORD = "Seed-Participant-Pass-1";
    await seedDatabase();

    const participant = await prisma.user.findUnique({ where: { email: "participant@example.test" } });
    expect(participant!.passwordHash).toMatch(/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/);
    expect(participant!.passwordHash).not.toBe("Seed-Participant-Pass-1");

    const res = await signIn("participant@example.test", "Seed-Participant-Pass-1");
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("PARTICIPANT");
  });

  it("TEST-33 (AC-33): an expired session is rejected with 401 and removed", async () => {
    const cookie = sessionCookie(await signIn("alex@example.test"))!;
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(await prisma.session.count()).toBe(0);
  });
});
