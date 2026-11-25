import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/src/lib/prisma.js";

// Lab 6 pre-UAT correction KI-9 (Issue #75): a valid note (up to 500 characters, F-04 §1) without spaces
// must wrap inside the goal card. This needs a real browser because jsdom does not compute layout.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

const PARTICIPANT_PASSWORD = process.env.SEED_PARTICIPANT_PASSWORD;
if (!PARTICIPANT_PASSWORD) {
  throw new Error("Missing required SEED_PARTICIPANT_PASSWORD in environment (checked server/.env).");
}

// Dedicated account and data so that no demo data is touched; everything is removed afterwards.
const EMAIL = "e2e-layout@example.test";
const TEMPLATE_NAME = "E2E Layout KI-9";
const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

test.describe.serial("Lab 6 KI-9 (#75): long notes stay inside the goal card", () => {
  let userId: number;
  let templateId: number;

  test.beforeAll(async () => {
    const seedParticipant = await prisma.user.findUnique({ where: { email: "participant@example.test" } });
    const seedManager = await prisma.user.findUnique({ where: { email: "manager@example.test" } });
    if (!seedParticipant || !seedManager) throw new Error("Seed users not found. Run 'npm run seed' first.");

    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: { passwordHash: seedParticipant.passwordHash },
      create: { email: EMAIL, passwordHash: seedParticipant.passwordHash, displayName: "E2E Layout", role: "PARTICIPANT" },
    });
    userId = user.id;
    await prisma.activityEntry.deleteMany({ where: { goal: { participantId: userId } } });
    await prisma.goal.deleteMany({ where: { participantId: userId } });
    await prisma.activityTemplate.deleteMany({ where: { name: TEMPLATE_NAME } });

    const template = await prisma.activityTemplate.create({
      data: { name: TEMPLATE_NAME, unit: "u", minValue: 1, maxValue: 10, status: "PUBLISHED", createdById: seedManager.id },
    });
    templateId = template.id;
    const goal = await prisma.goal.create({ data: { participantId: userId, templateId, dailyTarget: 5 } });
    await prisma.activityEntry.create({
      data: { goalId: goal.id, entryDate: bangkokToday(), value: 5, note: "n".repeat(500) },
    });
  });

  test.afterAll(async () => {
    if (userId) {
      await prisma.activityEntry.deleteMany({ where: { goal: { participantId: userId } } });
      await prisma.goal.deleteMany({ where: { participantId: userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (templateId) await prisma.activityTemplate.delete({ where: { id: templateId } }).catch(() => {});
    await prisma.$disconnect();
  });

  test("TEST-L6-75: a 500-character note without spaces wraps inside its card and the page does not scroll sideways", async ({
    page,
  }) => {
    await page.goto("/");
    await page.fill("#signin-email", EMAIL);
    await page.fill("#signin-password", PARTICIPANT_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("button", { name: "Goals" }).click();

    const card = page.locator(".card", { has: page.getByRole("heading", { name: TEMPLATE_NAME }) });
    const row = card.locator("li").first();
    await expect(row).toContainText("n".repeat(50));
    await expect(row).toContainText("100%");

    const sizes = await row.evaluate((li) => {
      const cardBody = li.closest(".card-body") as HTMLElement;
      const percent = [...li.querySelectorAll("span")].find((s) => s.textContent === "100%") as HTMLElement;
      return {
        rowScrollWidth: li.scrollWidth,
        rowClientWidth: li.clientWidth,
        cardRight: cardBody.getBoundingClientRect().right,
        percentRight: percent.getBoundingClientRect().right,
        pageScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    // The row's content fits the row (allow 1 px for rounding) ...
    expect(sizes.rowScrollWidth, JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.rowClientWidth + 1);
    // ... the percent stays inside the card ...
    expect(sizes.percentRight, JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.cardRight + 1);
    // ... and the page has no horizontal scrollbar.
    expect(sizes.pageScrollWidth, JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.viewportWidth);
  });
});
