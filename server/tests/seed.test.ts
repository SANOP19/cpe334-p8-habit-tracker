import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { seedDatabase } from "../prisma/seed.js";
import { resetDatabase } from "./harness.js";

describe("P1 Password Security & Seed Integrity against Real PostgreSQL", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("seeded passwords are stored as salted bcrypt hashes in the database and never as plain text", async () => {
    process.env.SEED_MANAGER_PASSWORD = "ManagerSecurePassword123!";
    process.env.SEED_PARTICIPANT_PASSWORD = "ParticipantSecurePassword123!";

    await seedDatabase();

    const manager = await prisma.user.findUnique({
      where: { email: "manager@example.test" },
    });
    const participant = await prisma.user.findUnique({
      where: { email: "participant@example.test" },
    });

    expect(manager).toBeDefined();
    expect(manager?.passwordHash).toBeDefined();
    expect(participant).toBeDefined();
    expect(participant?.passwordHash).toBeDefined();

    // Verify bcrypt hash format ($2a$ or $2b$, 60 chars)
    expect(manager?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    expect(participant?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);

    // Verify hashes never match the plain text passwords
    expect(manager?.passwordHash).not.toBe("ManagerSecurePassword123!");
    expect(participant?.passwordHash).not.toBe("ParticipantSecurePassword123!");
  });

  it("seedDatabase throws an error when seed passwords are missing from the environment", async () => {
    const origManagerPw = process.env.SEED_MANAGER_PASSWORD;
    const origPartPw = process.env.SEED_PARTICIPANT_PASSWORD;

    delete process.env.SEED_MANAGER_PASSWORD;
    delete process.env.SEED_PARTICIPANT_PASSWORD;

    await expect(seedDatabase()).rejects.toThrow(
      "Missing required seed passwords: SEED_MANAGER_PASSWORD and SEED_PARTICIPANT_PASSWORD must be defined in the environment."
    );

    process.env.SEED_MANAGER_PASSWORD = origManagerPw;
    process.env.SEED_PARTICIPANT_PASSWORD = origPartPw;
  });
});
