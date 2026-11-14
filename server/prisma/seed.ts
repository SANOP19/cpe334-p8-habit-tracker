import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { Role, TemplateStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

export async function seedDatabase() {
  console.log("Seeding Habit Tracker database...");

  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  const participantPassword = process.env.SEED_PARTICIPANT_PASSWORD;

  if (!managerPassword || !participantPassword) {
    throw new Error(
      "Missing required seed passwords: SEED_MANAGER_PASSWORD and SEED_PARTICIPANT_PASSWORD must be defined in the environment."
    );
  }

  const managerHash = await bcrypt.hash(managerPassword, 10);
  const participantHash = await bcrypt.hash(participantPassword, 10);

  // 1. Program Manager (fictional persona with reserved .test domain)
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.test" },
    update: { passwordHash: managerHash, displayName: "Dr. Morgan Staff" },
    create: {
      email: "manager@example.test",
      passwordHash: managerHash,
      displayName: "Dr. Morgan Staff",
      role: Role.PROGRAM_MANAGER,
    },
  });

  // 2. Participant (fictional persona with reserved .test domain)
  await prisma.user.upsert({
    where: { email: "participant@example.test" },
    update: { passwordHash: participantHash, displayName: "Alex Student" },
    create: {
      email: "participant@example.test",
      passwordHash: participantHash,
      displayName: "Alex Student",
      role: Role.PARTICIPANT,
    },
  });

  // 3. Published Template (Study / Reading habit)
  const existingTemplate = await prisma.activityTemplate.findFirst({
    where: { name: "Daily Reading" },
  });

  if (!existingTemplate) {
    await prisma.activityTemplate.create({
      data: {
        name: "Daily Reading",
        unit: "pages",
        minValue: 1.0,
        maxValue: 200.0,
        status: TemplateStatus.PUBLISHED,
        createdById: manager.id,
      },
    });
  }

  console.log("Habit Tracker seeding completed successfully.");
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
