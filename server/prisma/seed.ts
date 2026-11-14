import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { Role, TemplateStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

export async function seedDatabase() {
  console.log("Seeding HabitPulse database...");

  const managerPassword =
    process.env.SEED_MANAGER_PASSWORD || "TestManagerPass123!";
  const participantPassword =
    process.env.SEED_PARTICIPANT_PASSWORD || "TestParticipantPass123!";

  const managerHash = await bcrypt.hash(managerPassword, 10);
  const participantHash = await bcrypt.hash(participantPassword, 10);

  // 1. Program Manager
  const manager = await prisma.user.upsert({
    where: { email: "manager@habitpulse.com" },
    update: { passwordHash: managerHash, displayName: "Coach Alex" },
    create: {
      email: "manager@habitpulse.com",
      passwordHash: managerHash,
      displayName: "Coach Alex",
      role: Role.PROGRAM_MANAGER,
    },
  });

  // 2. Participants
  await prisma.user.upsert({
    where: { email: "participant1@habitpulse.com" },
    update: { passwordHash: participantHash, displayName: "Nara Kosiyaporn" },
    create: {
      email: "participant1@habitpulse.com",
      passwordHash: participantHash,
      displayName: "Nara Kosiyaporn",
      role: Role.PARTICIPANT,
    },
  });

  await prisma.user.upsert({
    where: { email: "participant2@habitpulse.com" },
    update: { passwordHash: participantHash, displayName: "Nitithorn Ketkaew" },
    create: {
      email: "participant2@habitpulse.com",
      passwordHash: participantHash,
      displayName: "Nitithorn Ketkaew",
      role: Role.PARTICIPANT,
    },
  });

  // 3. Published Template
  const existingTemplate = await prisma.activityTemplate.findFirst({
    where: { name: "Running" },
  });

  if (!existingTemplate) {
    await prisma.activityTemplate.create({
      data: {
        name: "Running",
        unit: "km",
        minValue: 0.1,
        maxValue: 42.195,
        status: TemplateStatus.PUBLISHED,
        createdById: manager.id,
      },
    });
  }

  console.log("Seeding completed successfully.");
}

if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "testing") {
  seedDatabase()
    .catch((e) => {
      console.error("Seeding error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
