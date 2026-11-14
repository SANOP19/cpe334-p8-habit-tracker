import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./harness.js";

describe("P1 Database Unique Constraints", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("inserting a second activity_entries row with the same goalId + entryDate fails (BR-04 unique constraint)", async () => {
    // 1. Create participant user
    const user = await prisma.user.create({
      data: {
        email: "constraint-test@habitpulse.com",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
        displayName: "Constraint Test User",
        role: "PARTICIPANT",
      },
    });

    // 2. Create template
    const template = await prisma.activityTemplate.create({
      data: {
        name: "Test Running",
        unit: "km",
        minValue: 0.1,
        maxValue: 42.195,
        status: "PUBLISHED",
        createdById: user.id,
      },
    });

    // 3. Create goal
    const goal = await prisma.goal.create({
      data: {
        participantId: user.id,
        templateId: template.id,
        dailyTarget: 5.0,
        status: "ACTIVE",
      },
    });

    // 4. Insert first entry for '2026-11-14'
    const entry1 = await prisma.activityEntry.create({
      data: {
        goalId: goal.id,
        entryDate: "2026-11-14",
        value: 5.0,
        note: "First entry",
      },
    });
    expect(entry1).toBeDefined();

    // 5. Attempt inserting second entry for same goalId and same entryDate -> MUST fail unique constraint
    await expect(
      prisma.activityEntry.create({
        data: {
          goalId: goal.id,
          entryDate: "2026-11-14",
          value: 3.0,
          note: "Duplicate entry for same day",
        },
      })
    ).rejects.toThrow();
  });
});
