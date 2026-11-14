// Renders an excerpt of the recorded release test output (docs/evidence/release/*.txt) as a terminal-style image.
// The lines are copied verbatim from the evidence files; nothing is typed by hand.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const ev = (f) => fs.readFileSync(path.join(repo, "docs", "evidence", "release", f), "utf8").split(/\r?\n/);
const pick = (lines, re) => lines.filter((l) => re.test(l)).map((l) => l.replace(/\s+\d+ms$/, ""));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const head = execSync("git log -1 --format=%h%x20%s 2bafb18", { cwd: repo, encoding: "utf8" }).trim();
const server = ev("server.txt");
const client = ev("client.txt");
const e2e = ev("e2e.txt");
const restart = ev("restart.txt");

const block = [
  `$ git log -1 --oneline   (tested commit, head of staging/sprint-1)`,
  head,
  ``,
  `$ npm run test:server`,
  ...pick(server, /^ ✓ tests\/\S+ \(\d+ tests?\)/),
  ...pick(server, /Test Files|^\s+Tests /),
  ``,
  `$ npm run test:client`,
  ...pick(client, /^ ✓ tests\/\S+ \(\d+ tests?\)/),
  ...pick(client, /Test Files|^\s+Tests /),
  ``,
  `$ npm run test:e2e`,
  ...pick(e2e, /ok \d|passed|failed/).map((l) => l.slice(0, 150)),
  ``,
  `$ npm run test:restart`,
  ...pick(restart, /Phase 5\]|Phase 6\]|VERIFIED/),
];

const html = `<html><body style="margin:0;background:#1e1e1e"><pre style="margin:0;padding:18px 22px;color:#d4d4d4;font:13px/1.45 Consolas,monospace;white-space:pre-wrap">${block
  .map((l) => esc(l))
  .map((l) => (l.startsWith("$ ") ? `<span style="color:#9cdcfe">${l}</span>` : l.replace(/(\d+ passed|✓|VERIFIED[^<]*)/g, '<span style="color:#6a9955">$1</span>')))
  .join("\n")}</pre></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 400 } });
await page.setContent(html);
await page.screenshot({ path: path.join(here, "images", "13-test-run.png"), fullPage: true });
await browser.close();
console.log("saved 13-test-run.png,", block.length, "lines");
