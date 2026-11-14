import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { requireRole } from "../src/middlewares/auth.js";

// TEST-R1: role check used by F-02..F-05 (AC-09, AC-16, AC-26, AC-32). Unit level, no database.
function requestAs(role: "PARTICIPANT" | "PROGRAM_MANAGER") {
  return { user: { id: 1, email: "x@example.test", displayName: "X", role } } as unknown as Request;
}

describe("TEST-R1 requireRole", () => {
  it("rejects a participant from a program-manager-only route with 403 FORBIDDEN", () => {
    const next = vi.fn();
    requireRole("PROGRAM_MANAGER")(requestAs("PARTICIPANT"), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
  });

  it("lets a program manager through", () => {
    const next = vi.fn();
    requireRole("PROGRAM_MANAGER")(requestAs("PROGRAM_MANAGER"), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("accepts any of several allowed roles", () => {
    const next = vi.fn();
    requireRole("PARTICIPANT", "PROGRAM_MANAGER")(requestAs("PARTICIPANT"), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
