import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("P1 Health Endpoint and Global Error Handler", () => {
  it("GET /api/health returns 200 with { status: 'ok' }", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "broken" }); // PR-5 (C-02): deliberately wrong to prove the merge gate. Never merge.
  });

  it("unhandled runtime error returns 500 with sanitized code and generic message (NFR-05)", async () => {
    const res = await request(app).get("/api/test/unexpected-error");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    });
    // Ensure no stack trace or SQL leakage in response
    expect(res.body.error.stack).toBeUndefined();
    expect(res.text).not.toContain("Simulated unhandled database failure");
  });

  it("sending malformed JSON payload returns 422 with VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ invalid json payload: true, }");

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Malformed JSON payload in request body",
      },
    });
  });
});
