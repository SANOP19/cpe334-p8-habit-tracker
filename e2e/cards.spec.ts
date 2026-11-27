import { test, expect, type Page } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/src/lib/prisma.js";

// Lab 6 Part D (#88, PT EXP-03): long template names and units without spaces must wrap inside
// the template and goal cards without pushing badges or text outside the card or scrolling the page.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD;
const PARTICIPANT_PASSWORD = process.env.SEED_PARTICIPANT_PASSWORD;
if (!MANAGER_PASSWORD || !PARTICIPANT_PASSWORD) {
  throw new Error("Missing SEED_MANAGER_PASSWORD or SEED_PARTICIPANT_PASSWORD in environment.");
}

const MANAGER_EMAIL = "e2e-cards-manager@example.test";
const PARTICIPANT_EMAIL = "e2e-cards-participant@example.test";
const LONG_NAME = "E2E-L6-88-" + "A".repeat(70); // 80 characters without spaces
const LONG_UNIT = "U".repeat(40); // 40 characters without spaces
const SHORT_NAME = "E2E L6-88 Short";

const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.fill("#signin-email", email);
  await page.fill("#signin-password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function measureCardOverflow(page: Page, cardTitle: string) {
  const card = page.locator(".card", { has: page.getByRole("heading", { name: cardTitle }) });
  await expect(card).toBeVisible();
  return card.evaluate((el) => {
    const cardRight = el.getBoundingClientRect().right;
    const h5 = el.querySelector("h5");
    const badge = el.querySelector(".badge");
    const children = [...el.querySelectorAll("h5, .badge, p, label, li, span, button, input")].map((child) => {
      const r = child.getBoundingClientRect();
      return {
        tag: child.tagName,
        cls: child.className,
        right: Math.round(r.right),
      };
    });
    const maxRight = Math.max(...children.map((c) => c.right));
    const offenders = children.filter((c) => c.right > cardRight + 1);
    return {
      cardRight: Math.round(cardRight),
      titleRight: h5 ? Math.round(h5.getBoundingClientRect().right) : null,
      badgeRight: badge ? Math.round(badge.getBoundingClientRect().right) : null,
      maxRight,
      offendersCount: offenders.length,
      offenders: offenders.slice(0, 5),
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

test.describe("Lab 6 #88: long names and units stay inside the cards", () => {
  let managerId: number;
  let participantId: number;

  test.beforeAll(async () => {
    const seedManager = await prisma.user.findUnique({ where: { email: "manager@example.test" } });
    const seedParticipant = await prisma.user.findUnique({ where: { email: "participant@example.test" } });
    if (!seedManager || !seedParticipant) throw new Error("Seed users not found. Run 'npm run seed' first.");

    const mgr = await prisma.user.upsert({
      where: { email: MANAGER_EMAIL },
      update: { passwordHash: seedManager.passwordHash },
      create: { email: MANAGER_EMAIL, passwordHash: seedManager.passwordHash, displayName: "E2E Cards Manager", role: "PROGRAM_MANAGER" },
    });
    managerId = mgr.id;

    const part = await prisma.user.upsert({
      where: { email: PARTICIPANT_EMAIL },
      update: { passwordHash: seedParticipant.passwordHash },
      create: { email: PARTICIPANT_EMAIL, passwordHash: seedParticipant.passwordHash, displayName: "E2E Cards Participant", role: "PARTICIPANT" },
    });
    participantId = part.id;

    await prisma.activityEntry.deleteMany({ where: { goal: { participantId } } });
    await prisma.goal.deleteMany({ where: { participantId } });
    await prisma.activityTemplate.deleteMany({
      where: { createdById: managerId, name: { in: [LONG_NAME, SHORT_NAME] } },
    });

    const longTpl = await prisma.activityTemplate.create({
      data: { name: LONG_NAME, unit: LONG_UNIT, minValue: 1, maxValue: 60, status: "PUBLISHED", createdById: managerId },
    });
    await prisma.activityTemplate.create({
      data: { name: SHORT_NAME, unit: "min", minValue: 1, maxValue: 60, status: "PUBLISHED", createdById: managerId },
    });

    const goal = await prisma.goal.create({ data: { participantId, templateId: longTpl.id, dailyTarget: 30 } });
    await prisma.activityEntry.create({
      data: { goalId: goal.id, entryDate: bangkokToday(), value: 30 },
    });
  });

  test.afterAll(async () => {
    if (participantId) {
      await prisma.activityEntry.deleteMany({ where: { goal: { participantId } } });
      await prisma.goal.deleteMany({ where: { participantId } });
      await prisma.session.deleteMany({ where: { userId: participantId } });
      await prisma.user.delete({ where: { id: participantId } }).catch(() => {});
    }
    if (managerId) {
      await prisma.activityTemplate.deleteMany({
        where: { createdById: managerId, name: { in: [LONG_NAME, SHORT_NAME] } },
      });
      await prisma.session.deleteMany({ where: { userId: managerId } });
      await prisma.user.delete({ where: { id: managerId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  for (const vp of [
    { name: "375 px", width: 375, height: 812 },
    { name: "1280 px", width: 1280, height: 800 },
  ]) {
    test(`TEST-L6-88: manager Templates page fits card and viewport at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page, MANAGER_EMAIL, MANAGER_PASSWORD);
      await page.getByRole("button", { name: "Templates" }).click();

      const m = await measureCardOverflow(page, LONG_NAME);
      expect(m.maxRight, `Manager Templates ${vp.name}: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.cardRight + 1);
      expect(m.pageScrollWidth, `Manager Templates ${vp.name}: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.viewportWidth);
    });

    test(`TEST-L6-88: participant Templates page (with Set goal open) fits card and viewport at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page, PARTICIPANT_EMAIL, PARTICIPANT_PASSWORD);
      await page.getByRole("button", { name: "Templates" }).click();

      const card = page.locator(".card", { has: page.getByRole("heading", { name: LONG_NAME }) });
      await card.getByRole("button", { name: "Set goal" }).click();
      await expect(card.getByRole("button", { name: "Save goal" })).toBeVisible();

      const m = await measureCardOverflow(page, LONG_NAME);
      expect(m.maxRight, `Participant Templates ${vp.name}: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.cardRight + 1);
      expect(m.pageScrollWidth, `Participant Templates ${vp.name}: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.viewportWidth);
    });

    test(`TEST-L6-88: participant Goals page fits card and viewport at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page, PARTICIPANT_EMAIL, PARTICIPANT_PASSWORD);
      await page.getByRole("button", { name: "Goals" }).click();

      const card = page.locator(".card", { has: page.getByRole("heading", { name: LONG_NAME }) });
      await expect(card.locator("li").first()).toContainText(`30 ${LONG_UNIT}`);

      const m = await measureCardOverflow(page, LONG_NAME);
      expect(m.maxRight, `Participant Goals ${vp.name}: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.cardRight + 1);
      expect(m.pageScrollWidth, `Participant Goals ${vp.name}: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.viewportWidth);
    });
  }

  test("TEST-L6-88 (control): short-name card keeps badge on the same line as title at 1280 px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signIn(page, MANAGER_EMAIL, MANAGER_PASSWORD);
    await page.getByRole("button", { name: "Templates" }).click();

    const card = page.locator(".card", { has: page.getByRole("heading", { name: SHORT_NAME }) });
    await expect(card).toBeVisible();
    const row = await card.evaluate((el) => {
      const title = el.querySelector("h5")!.getBoundingClientRect();
      const badge = el.querySelector(".badge")!.getBoundingClientRect();
      return { titleTop: Math.round(title.top), badgeTop: Math.round(badge.top), diff: Math.round(Math.abs(badge.top - title.top)) };
    });
    expect(row.diff, JSON.stringify(row)).toBeLessThanOrEqual(20);
  });
});
