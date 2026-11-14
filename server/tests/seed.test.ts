import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { seedDatabase } from "../prisma/seed.js";
import { resetDatabase } from "./harness.js";

describe("P1 Password Security & Seed Integrity", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("seeded password in database is stored as a bcrypt hash, not plain text", async () => {
    await seedDatabase();

    const manager = await prisma.user.findUnique({
      where: { email: "manager@habitpulse.com" },
    });
    expect(manager).toBeDefined();
    expect(manager?.passwordHash).toBeDefined();

    // Must be a bcrypt hash (starts with $2a$ or $2b$, 60 chars)
    expect(manager?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);

    // Must NEVER match raw password
    expect(manager?.passwordHash).not.toBe("change-me-manager-password");
    expect(manager?.passwordHash).not.toBe("AdminInitial123!");
    expect(manager?.passwordHash).not.toBe("TestManagerPass123!");
  });
});
