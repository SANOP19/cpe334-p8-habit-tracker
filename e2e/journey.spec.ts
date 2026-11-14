import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/src/lib/prisma.js";

// Load environment variables directly from server/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

const PARTICIPANT_PASSWORD = process.env.SEED_PARTICIPANT_PASSWORD;
if (!PARTICIPANT_PASSWORD) {
  throw new Error("Missing required SEED_PARTICIPANT_PASSWORD in environment (checked server/.env).");
}

// Dedicated E2E participant account so that demo data for participant@example.test is never deleted
const E2E_PARTICIPANT_EMAIL = "e2e-participant@example.test";
const E2E_DISPLAY_NAME = "E2E Student";

test.describe.serial("TEST-27 (AC-27): Participant Lifecycle Journey E2E", () => {
  let e2eUserId: number;

  test.beforeAll(async () => {
    // Locate seeded participant to reuse role and password hash or verify seed
    const seedUser = await prisma.user.findUnique({ where: { email: "participant@example.test" } });
    if (!seedUser) {
      throw new Error("Base seed user participant@example.test not found. Run 'npm run seed' first.");
    }

    // Upsert dedicated E2E participant account with the same password hash
    const user = await prisma.user.upsert({
      where: { email: E2E_PARTICIPANT_EMAIL },
      update: {
        passwordHash: seedUser.passwordHash,
        displayName: E2E_DISPLAY_NAME,
      },
      create: {
        email: E2E_PARTICIPANT_EMAIL,
        passwordHash: seedUser.passwordHash,
        displayName: E2E_DISPLAY_NAME,
        role: seedUser.role,
      },
    });

    e2eUserId = user.id;

    // Clean up only the dedicated E2E participant's goals and entries (leaves participant@example.test intact)
    await prisma.activityEntry.deleteMany({ where: { goal: { participantId: e2eUserId } } });
    await prisma.goal.deleteMany({ where: { participantId: e2eUserId } });
    await prisma.session.deleteMany({ where: { userId: e2eUserId } });
  });

  test.afterAll(async () => {
    // Clean up dedicated test data after the run
    if (e2eUserId) {
      await prisma.activityEntry.deleteMany({ where: { goal: { participantId: e2eUserId } } });
      await prisma.goal.deleteMany({ where: { participantId: e2eUserId } });
      await prisma.session.deleteMany({ where: { userId: e2eUserId } });
      await prisma.user.delete({ where: { id: e2eUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test("completes full cycle: sign in, set goal, log entry, verify progress, duplicate rejection, and sign out", async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Step 1: Open landing page (Sign in)
    // -------------------------------------------------------------------------
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2: Sign in as dedicated E2E participant
    // -------------------------------------------------------------------------
    await page.fill("#signin-email", E2E_PARTICIPANT_EMAIL);
    await page.fill("#signin-password", PARTICIPANT_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify navigation to authenticated shell with dedicated participant credentials
    await expect(page.getByText(E2E_DISPLAY_NAME)).toBeVisible();
    await expect(page.getByText("Participant")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity Templates" })).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 3: Browse templates and set goal on "Daily Reading"
    // -------------------------------------------------------------------------
    const templateCard = page.locator(".card").filter({ hasText: "Daily Reading" });
    await expect(templateCard).toBeVisible();
    await templateCard.getByRole("button", { name: "Set goal" }).click();

    const targetInput = templateCard.getByLabel(/Daily target/i);
    await targetInput.fill("20");
    await templateCard.getByRole("button", { name: "Save goal" }).click();
    await expect(templateCard.getByText("Goal saved.")).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 4: Navigate to Goals page
    // -------------------------------------------------------------------------
    await page.getByRole("button", { name: "Goals" }).click();
    await expect(page.getByRole("heading", { name: "My Goals" })).toBeVisible();

    const goalCard = page.locator(".card").filter({ hasText: "Daily Reading" });
    await expect(goalCard).toBeVisible();
    await expect(goalCard.getByText("Daily target: 20 pages")).toBeVisible();
    await expect(goalCard.getByText("ACTIVE")).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 5: Record daily activity entry (25 pages -> 125% progress, Achieved)
    // -------------------------------------------------------------------------
    const amountInput = goalCard.getByLabel(/Amount/i);
    await amountInput.fill("25");

    const noteInput = goalCard.getByLabel(/Note/i);
    await noteInput.fill("E2E reading session");

    await goalCard.getByRole("button", { name: "Save entry" }).click();

    // Verify success feedback and entry display
    await expect(goalCard.getByText("Entry saved.")).toBeVisible();
    await expect(goalCard.getByText("25 pages")).toBeVisible();
    await expect(goalCard.getByText("125%")).toBeVisible();
    await expect(goalCard.getByText("Achieved", { exact: true })).toBeVisible();
    await expect(goalCard.getByText("Achieved 1 of 1 logged days")).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 6: Attempt duplicate entry for the same date -> should be rejected with 409
    // -------------------------------------------------------------------------
    await amountInput.fill("30");
    await goalCard.getByRole("button", { name: "Save entry" }).click();

    await expect(goalCard.getByRole("alert")).toContainText("An activity entry for this date already exists.");

    // -------------------------------------------------------------------------
    // Step 7: Sign out
    // -------------------------------------------------------------------------
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText(E2E_DISPLAY_NAME)).not.toBeVisible();
  });
});
