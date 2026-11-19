import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { getTestPrisma } from "./harness.js";

// Lab 5 #37 (Student Guide Episode 2, point 6): readiness probe used by the
// post-deploy smoke test. It must prove the API can reach the database.
describe("GET /api/ready (Lab 5 readiness probe)", () => {
  beforeAll(async () => {
    await getTestPrisma();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with db connected when the database answers", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
  });

  it("returns 503 without internal details when the database cannot be reached", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 password=secret")
    );

    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "not_ready" });
    expect(res.text).not.toContain("ECONNREFUSED");
    expect(res.text).not.toContain("secret");
  });

  it("does not require a session (public, read-only)", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).not.toBe(401);
  });
});
