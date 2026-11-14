// Renders the final project-board status (gh project item-list 4) as a terminal-style image. Output is the real command result.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
const here = path.dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(execSync("gh project item-list 4 --owner SANOP19 --limit 100 --format json", { encoding: "utf8" }));
const items = d.items.map((i) => ({ n: i.content?.number, type: i.content?.type, t: i.content?.title ?? i.title, s: i.status })).sort((a, b) => a.n - b.n);
const count = {};
items.forEach((i) => (count[i.s] = (count[i.s] ?? 0) + 1));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lines = [
  "$ gh project item-list 4 --owner SANOP19   (board: CPE334 Habit Tracker Board)",
  `total ${d.totalCount} items — ` + Object.entries(count).map(([k, v]) => `${k}: ${v}`).join(", "),
  "",
  ...items.map((i) => `${String(i.s).padEnd(6)} ${String(i.type ?? "").padEnd(12)} #${String(i.n).padEnd(3)} ${i.t.slice(0, 80)}`),
];
const html = `<html><body style="margin:0;background:#1e1e1e"><pre style="margin:0;padding:14px 18px;color:#d4d4d4;font:13px/1.4 Consolas,monospace">${lines.map((l, i) => (i < 2 ? `<span style="color:#9cdcfe">${esc(l)}</span>` : esc(l).replace(/^Done/, '<span style="color:#6a9955">Done</span>'))).join("\n")}</pre></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 860, height: 300 } });
await p.setContent(html);
await p.screenshot({ path: path.join(here, "images", "gh-board.png"), fullPage: true });
await b.close();
console.log("saved gh-board.png", items.length, JSON.stringify(count));
