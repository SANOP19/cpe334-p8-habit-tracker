import dotenv from "dotenv";
// Load test environment
dotenv.config({ path: ".env.test" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { prisma, setPrisma } from "../src/lib/prisma.js";

const testDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

if (!testDbUrl) {
  throw new Error(
    "Missing test database configuration: DATABASE_URL_TEST or DATABASE_URL must be defined."
  );
}

// Safety check: ensure we are not wiping a development or production database
if (
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL_TEST &&
  process.env.DATABASE_URL === process.env.DATABASE_URL_TEST &&
  process.env.NODE_ENV !== "test"
) {
  throw new Error(
    "Safety check failed: DATABASE_URL_TEST cannot be identical to DATABASE_URL outside of test environment."
  );
}

let testClient: PrismaClient | null = null;

export async function getTestPrisma(): Promise<PrismaClient> {
  if (!testClient) {
    testClient = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });

    try {
      // Test real connection to PostgreSQL database
      await testClient.$connect();
      setPrisma(testClient);
    } catch (err: any) {
      throw new Error(
        `Failed to connect to PostgreSQL test database at "${testDbUrl}". Tests require a running PostgreSQL instance with migrations applied.\nDetails: ${err.message}`
      );
    }
  }
  return testClient;
}

export async function resetDatabase(): Promise<void> {
  const db = await getTestPrisma();
  // Clear tables in reverse dependency order
  await db.activityEntry.deleteMany();
  await db.goal.deleteMany();
  await db.activityTemplate.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
}
