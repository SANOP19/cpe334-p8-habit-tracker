import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./harness.js";

describe("P1 Database Schema Constraints against Real PostgreSQL", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("inserting a second activity_entries row with the same goalId + entryDate fails (BR-04 unique constraint)", async () => {
    // 1. Create participant user
    const user = await prisma.user.create({
      data: {
        email: "participant-unique@example.test",
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
        minValue: 1.0,
        maxValue: 50.0,
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

  it("inserting a template with minValue >= maxValue fails database CHECK constraint (BR-05)", async () => {
    const manager = await prisma.user.create({
      data: {
        email: "manager-check@example.test",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
        displayName: "Check Test Manager",
        role: "PROGRAM_MANAGER",
      },
    });

    // Attempt inserting template where minValue (50) is greater than maxValue (10)
    await expect(
      prisma.activityTemplate.create({
        data: {
          name: "Invalid Range Template",
          unit: "pages",
          minValue: 50.0,
          maxValue: 10.0,
          status: "DRAFT",
          createdById: manager.id,
        },
      })
    ).rejects.toThrow();

    // Attempt inserting template where minValue equals maxValue
    await expect(
      prisma.activityTemplate.create({
        data: {
          name: "Equal Range Template",
          unit: "pages",
          minValue: 20.0,
          maxValue: 20.0,
          status: "DRAFT",
          createdById: manager.id,
        },
      })
    ).rejects.toThrow();
  });

  it("inserting a second ACTIVE goal for the same participant and template fails partial unique index (BR-09)", async () => {
    const participant = await prisma.user.create({
      data: {
        email: "participant-goal@example.test",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
        displayName: "Goal Test Participant",
        role: "PARTICIPANT",
      },
    });

    const manager = await prisma.user.create({
      data: {
        email: "manager-goal@example.test",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
        displayName: "Goal Test Manager",
        role: "PROGRAM_MANAGER",
      },
    });

    const template = await prisma.activityTemplate.create({
      data: {
        name: "Cycling",
        unit: "km",
        minValue: 1.0,
        maxValue: 100.0,
        status: "PUBLISHED",
        createdById: manager.id,
      },
    });

    // First ACTIVE goal should succeed
    const goal1 = await prisma.goal.create({
      data: {
        participantId: participant.id,
        templateId: template.id,
        dailyTarget: 15.0,
        status: "ACTIVE",
      },
    });
    expect(goal1).toBeDefined();

    // Second ACTIVE goal for same participant and template must fail unique index
    await expect(
      prisma.goal.create({
        data: {
          participantId: participant.id,
          templateId: template.id,
          dailyTarget: 20.0,
          status: "ACTIVE",
        },
      })
    ).rejects.toThrow();
  });
});
