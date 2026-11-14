// Captures the Part F evidence screenshots from the running release (local dev servers + PostgreSQL).
// Uses the seeded synthetic accounts; passwords are read from server/.env and never written anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import dotenv from "dotenv";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const out = path.join(here, "images");
fs.mkdirSync(out, { recursive: true });
dotenv.config({ path: path.join(repo, "server", ".env") });
const require = createRequire(import.meta.url);
const { PrismaClient } = require(path.join(repo, "server", "node_modules", "@prisma", "client"));
const prisma = new PrismaClient();
const PW = { participant: process.env.SEED_PARTICIPANT_PASSWORD, manager: process.env.SEED_MANAGER_PASSWORD };
const BASE = "http://localhost:5173";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("not ready: " + url);
}
const procs = [];
function start(script) {
  const p = spawn(npm, ["run", script], { cwd: repo, shell: true, stdio: "ignore" });
  procs.push(p);
}
function stopAll() {
  for (const p of procs) {
    try { if (process.platform === "win32") execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: "ignore" }); else p.kill("SIGTERM"); } catch {}
  }
}

const shot = async (page, name, opts = {}) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, name), fullPage: opts.full ?? false });
  console.log("  saved", name);
};

async function signIn(page, email, password) {
  await page.goto(BASE + "/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function apiPage(context, pathName, name, caption) {
  // Shows the raw API response the server returns to this session (backend evidence, not a hidden button).
  const page = await context.newPage();
  const res = await page.request.get(BASE + pathName);
  const body = await res.text();
  await page.setContent(`<html><body style="font-family:Consolas,monospace;padding:24px;background:#fff">
    <div style="font-family:Segoe UI,Arial;color:#555;margin-bottom:8px">${caption}</div>
    <div style="font-size:15px"><b>GET ${pathName}</b> → <b style="color:${res.status() < 300 ? "#1b6e2d" : "#b00020"}">HTTP ${res.status()}</b></div>
    <pre style="font-size:14px;background:#f6f8fa;border:1px solid #ddd;padding:12px;white-space:pre-wrap">${body.replace(/</g, "&lt;")}</pre></body></html>`);
  await page.setViewportSize({ width: 900, height: 260 });
  await shot(page, name);
  await page.close();
  return { status: res.status(), body };
}

try {
  if (!PW.participant || !PW.manager) throw new Error("seed passwords missing in server/.env");
  // Clean starting condition for the demo participant (dev database only).
  const p1 = await prisma.user.findUnique({ where: { email: "participant@example.test" } });
  await prisma.activityEntry.deleteMany({ where: { goal: { participantId: p1.id } } });
  await prisma.goal.deleteMany({ where: { participantId: p1.id } });

  start("dev:server");
  start("dev:client");
  await waitFor("http://localhost:3000/api/health");
  await waitFor(BASE);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const page = await ctx.newPage();

  console.log("Scenario 1 – normal journey");
  await page.goto(BASE + "/");
  await page.getByLabel("Email").fill("participant@example.test");
  await page.getByLabel("Password").fill(PW.participant);
  await shot(page, "01-signin.png");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("alert").waitFor();
  await shot(page, "12-wrong-password.png");

  await page.getByLabel("Password").fill(PW.participant);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Activity Templates" }).waitFor();
  await shot(page, "02-templates.png");

  const card = page.locator(".card").filter({ hasText: "Daily Reading" });
  await card.getByRole("button", { name: "Set goal" }).click();
  await card.getByLabel(/Daily target/).fill("20");
  await card.getByRole("button", { name: "Save goal" }).click();
  await card.getByText("Goal saved.").waitFor();
  await shot(page, "03-goal-saved.png");

  await page.getByRole("button", { name: "Goals" }).click();
  const goal = page.locator(".card").filter({ hasText: "Daily Reading" });
  await goal.getByLabel(/Amount/).fill("25");
  await goal.getByLabel(/Note/).fill("Read two chapters");
  await goal.getByRole("button", { name: "Save entry" }).click();
  await goal.getByText("125%").waitFor();
  await shot(page, "04-entry-progress.png");

  await page.reload();
  await page.getByRole("button", { name: "Goals" }).click();
  await page.locator(".card").filter({ hasText: "Daily Reading" }).getByText("125%").waitFor();
  await shot(page, "05-after-reload.png");

  console.log("Scenario 2 – rule rejections");
  const g2 = page.locator(".card").filter({ hasText: "Daily Reading" });
  await g2.getByLabel(/Amount/).fill("30");
  await g2.getByRole("button", { name: "Save entry" }).click();
  await g2.getByRole("alert").waitFor();
  await shot(page, "06-duplicate-rejected.png");
  await g2.getByLabel(/Amount/).fill("300");
  await g2.getByRole("button", { name: "Save entry" }).click();
  await g2.getByText(/between 1 and 200/).waitFor();
  await shot(page, "07-out-of-range.png");

  const goalId = (await prisma.goal.findFirst({ where: { participantId: p1.id } })).id;

  console.log("Scenario 3 – sign-out and forbidden operations");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("heading", { name: "Sign in" }).waitFor();
  await shot(page, "08-signed-out.png");
  const after = await apiPage(ctx, "/api/auth/me", "08b-after-signout-me.png", "Same browser session after Sign out — the old cookie no longer works");

  const ctx2 = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const p2 = await ctx2.newPage();
  await signIn(p2, "participant2@example.test", PW.participant);
  await p2.getByRole("heading", { name: "Activity Templates" }).waitFor();
  const own = await apiPage(ctx2, "/api/goals", "09a-participant2-own-goals.png", "Signed in as participant2@example.test (Blake Student): own goals");
  const other = await apiPage(ctx2, `/api/goals/${goalId}/progress`, "09-participant2-other-progress-404.png", `Signed in as participant2@example.test — requesting participant@example.test's goal ${goalId} progress`);

  const ctx3 = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const m = await ctx3.newPage();
  await signIn(m, "manager@example.test", PW.manager);
  await m.getByRole("heading", { name: "Activity Templates" }).waitFor();
  await shot(m, "10a-manager-templates.png");
  const mgr = await apiPage(ctx3, "/api/goals", "10-manager-goals-403.png", "Signed in as manager@example.test (Program Manager) — reading participants' goals");
  const mgr2 = await apiPage(ctx3, `/api/goals/${goalId}/progress`, "10b-manager-progress-403.png", `Signed in as manager@example.test — reading participant goal ${goalId} progress`);

  const ctx4 = await browser.newContext();
  const anon = await apiPage(ctx4, "/api/goals", "11-no-session-401.png", "No session (new browser context)");

  fs.writeFileSync(path.join(out, "capture-results.json"), JSON.stringify({
    goalId, afterSignout: after.status, p2Own: own.status, p2Other: other.status, manager: mgr.status, manager2: mgr2.status, anonymous: anon.status,
    capturedAt: new Date().toISOString(),
  }, null, 2));
  await browser.close();
} finally {
  await prisma.$disconnect();
  stopAll();
}
console.log("done");
