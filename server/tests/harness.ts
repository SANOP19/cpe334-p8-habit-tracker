import dotenv from "dotenv";
// Load test environment
dotenv.config({ path: ".env.test" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { prisma, setPrisma } from "../src/lib/prisma.js";

const testDbUrl = process.env.DATABASE_URL_TEST;

if (!testDbUrl) {
  throw new Error(
    "Missing required environment variable: DATABASE_URL_TEST must be defined to run tests against a dedicated test database."
  );
}

// Safety check: ensure we are not wiping a development or production database
if (process.env.DATABASE_URL && testDbUrl === process.env.DATABASE_URL) {
  throw new Error(
    "Safety check failed: DATABASE_URL_TEST cannot be identical to DATABASE_URL. Tests must run against a dedicated test database."
  );
}

function getSafeDbTarget(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    const port = u.port ? `:${u.port}` : ":5432";
    return `${u.hostname}${port}${u.pathname}`;
  } catch {
    return "unknown-database-target";
  }
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
      const safeTarget = getSafeDbTarget(testDbUrl);
      throw new Error(
        `Failed to connect to PostgreSQL test database at "${safeTarget}". Tests require a running PostgreSQL instance with migrations applied.\nDetails: ${err.message}`
      );
    }
  }
  return testClient;
}

export async function resetDatabase(): Promise<void> {
  const db = await getTestPrisma();
  // Atomic truncation with CASCADE to handle foreign keys and reset identity sequences
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE "activity_entry_revisions", "activity_entries", "goals", "activity_templates", "sessions", "users" RESTART IDENTITY CASCADE;`
  );
}
