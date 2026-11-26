import { test, expect, type Page } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../server/src/lib/prisma.js";

// Lab 6 pre-UAT correction KI-10 (Issue #79): on a phone-width screen (375 px) every header item
// (F-01 §UI: display name, role label, Sign out; navigation) must stay inside the viewport and the
// page must not scroll sideways (SRS A-05: desktop or mobile browsers). Needs a real browser for layout.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

const PARTICIPANT_PASSWORD = process.env.SEED_PARTICIPANT_PASSWORD;
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD;
if (!PARTICIPANT_PASSWORD || !MANAGER_PASSWORD) {
  throw new Error("Missing SEED_PARTICIPANT_PASSWORD or SEED_MANAGER_PASSWORD in environment (checked server/.env).");
}

// Dedicated accounts with the seed users' display names and roles, so no demo data or session is touched;
// they are removed afterwards.
const ACCOUNTS = [
  { email: "e2e-header-participant@example.test", displayName: "Alex Student", role: "PARTICIPANT" as const, seed: "participant@example.test", password: PARTICIPANT_PASSWORD, label: "Participant" },
  { email: "e2e-header-manager@example.test", displayName: "Dr. Morgan Staff", role: "PROGRAM_MANAGER" as const, seed: "manager@example.test", password: MANAGER_PASSWORD, label: "Program Manager" },
];

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.fill("#signin-email", email);
  await page.fill("#signin-password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

/** Right edge of every header item and the page width, measured in the browser. */
async function measureHeader(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector("nav") as HTMLElement;
    const items = [...nav.querySelectorAll(".navbar-brand, .nav-link, .fw-semibold, .badge, button")].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el as HTMLElement).innerText.trim(), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top) };
    });
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      items,
    };
  });
}

// Not serial: each test signs in on its own, so one failing role does not hide the others.
test.describe("Lab 6 KI-10 (#79): the header fits a phone-width screen", () => {
  const ids: number[] = [];

  test.beforeAll(async () => {
    for (const a of ACCOUNTS) {
      const seedUser = await prisma.user.findUnique({ where: { email: a.seed } });
      if (!seedUser) throw new Error("Seed users not found. Run 'npm run seed' first.");
      const user = await prisma.user.upsert({
        where: { email: a.email },
        update: { passwordHash: seedUser.passwordHash, displayName: a.displayName, role: a.role },
        create: { email: a.email, passwordHash: seedUser.passwordHash, displayName: a.displayName, role: a.role },
      });
      ids.push(user.id);
    }
  });

  test.afterAll(async () => {
    for (const id of ids) {
      await prisma.session.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  for (const a of ACCOUNTS) {
    test(`TEST-L6-79: at 375 px every header item of a ${a.label} is inside the screen and the page does not scroll sideways`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await signIn(page, a.email, a.password);
      await expect(page.locator("nav")).toContainText(a.displayName);
      await expect(page.locator("nav")).toContainText(a.label);

      const m = await measureHeader(page);
      const outside = m.items.filter((i) => i.left < 0 || i.right > m.viewportWidth);
      expect(outside, JSON.stringify(m)).toEqual([]);
      expect(m.pageScrollWidth, JSON.stringify(m)).toBeLessThanOrEqual(m.viewportWidth);

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page.locator("#signin-email")).toBeVisible();
    });
  }

  test("TEST-L6-79: on a 1280 px screen the header stays on one line", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const a = ACCOUNTS[1];
    await signIn(page, a.email, a.password);
    const m = await measureHeader(page);
    const tops = new Set(m.items.map((i) => i.top));
    const spread = Math.max(...m.items.map((i) => i.top)) - Math.min(...m.items.map((i) => i.top));
    // Items of one line can differ by a few pixels in their top (button vs text); a second line would be ~40 px lower.
    expect(spread, JSON.stringify({ tops: [...tops], m })).toBeLessThan(20);
    expect(m.pageScrollWidth, JSON.stringify(m)).toBeLessThanOrEqual(m.viewportWidth);
    await page.getByRole("button", { name: "Sign out" }).click();
  });
});
