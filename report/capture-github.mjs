// Screenshots of the public GitHub pages used as workflow evidence in Part F (no sign-in needed: the repo is public).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "images");
const R = "https://github.com/SANOP19/cpe334-p8-habit-tracker";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 820, height: 780 }, colorScheme: "light", locale: "en-US" });
const page = await ctx.newPage();

async function top(url, name) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, name) });
  console.log("saved", name);
}
async function at(url, text, name) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const el = page.getByText(text, { exact: false }).first(); // top of review block;
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 8000 });
    await page.evaluate(() => window.scrollBy(0, -15));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, name) });
    console.log("saved", name);
  } catch (e) {
    console.log("could not find", JSON.stringify(text), "on", url);
  }
}

await top(`${R}/issues/20`, "gh-issue-20.png");
await top(`${R}/pull/29`, "gh-pr-29-top.png");
await at(`${R}/pull/29`, "requested changes", "gh-pr-29-review.png");
await top(`${R}/pull/29/commits`, "gh-pr-29-commits.png");
await top(`${R}/pull/30`, "gh-pr-30-top.png");
await at(`${R}/pull/30`, "approved these changes", "gh-pr-30-review.png");
await top(`${R}/pull/30/commits`, "gh-pr-30-commits.png");
await top(`${R}/pull/34`, "gh-pr-34-top.png");
await at(`${R}/pull/34`, "approved these changes", "gh-pr-34-review.png");
await top(`${R}/releases/tag/v0.1.0-sprint1`, "gh-tag.png");
await browser.close();
