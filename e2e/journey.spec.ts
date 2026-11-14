import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/src/lib/prisma.js";

const PARTICIPANT_EMAIL = "participant@example.test";
const PARTICIPANT_PASSWORD = process.env.SEED_PARTICIPANT_PASSWORD || "ParticipantPass123!";

test.describe.serial("TEST-27 (AC-27): Participant Lifecycle Journey E2E", () => {
  let participantUserId: number;

  test.beforeAll(async () => {
    // Clean up any pre-existing goals and entries for participant@example.test to ensure repeatability
    const user = await prisma.user.findUnique({ where: { email: PARTICIPANT_EMAIL } });
    if (user) {
      participantUserId = user.id;
      await prisma.activityEntry.deleteMany({ where: { goal: { participantId: user.id } } });
      await prisma.goal.deleteMany({ where: { participantId: user.id } });
    }
  });

  test.afterAll(async () => {
    // Clean up test data after the run
    if (participantUserId) {
      await prisma.activityEntry.deleteMany({ where: { goal: { participantId: participantUserId } } });
      await prisma.goal.deleteMany({ where: { participantId: participantUserId } });
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
    // Step 2: Sign in as participant
    // -------------------------------------------------------------------------
    await page.fill("#signin-email", PARTICIPANT_EMAIL);
    await page.fill("#signin-password", PARTICIPANT_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify navigation to authenticated shell
    await expect(page.getByText("Alex Student")).toBeVisible();
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
    await expect(page.getByText("Alex Student")).not.toBeVisible();
  });
});
