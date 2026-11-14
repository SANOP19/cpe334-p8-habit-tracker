// Builds the Deliverable 1 PDF from the repository documents.
//   cd report && npm install && npm run build   →   report/out/Deliverable1-Theme8.pdf
// Parts A–F are taken from the files listed in sections.json, so the PDF always matches the docs in Git.
// Page numbers in the contents and navigation tables come from a first render (two-pass build).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { marked } from "marked";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const outDir = path.join(here, "out");
const outPdf = path.join(outDir, "Deliverable1-Theme8.pdf");
const config = JSON.parse(fs.readFileSync(path.join(here, "sections.json"), "utf8"));

const read = (rel) => fs.readFileSync(path.resolve(here, rel), "utf8").replace(/\r\n/g, "\n");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (md) => md.replace(/[`*_]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();

// ---------------------------------------------------------------- markdown helpers
function demoteHeadings(md) {
  // One level down inside a part: document "#" becomes h2, and so on (outside code fences).
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^```/.test(line)) inFence = !inFence;
      if (!inFence && /^#{1,5} /.test(line)) return "#" + line;
      return line;
    })
    .join("\n");
}

function simplifyMath(md) {
  const sym = (s) =>
    s
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\ge(q)?/g, "≥")
      .replace(/\\le(q)?/g, "≤")
      .replace(/\\rightarrow/g, "→")
      .replace(/\\times/g, "×")
      .replace(/\\,/g, " ")
      .trim();
  return md
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => "`" + sym(m) + "`")
    .replace(/\$([^$\n]*\\[^$\n]*)\$/g, (_, m) => sym(m));
}

function render(md) {
  let html = marked.parse(md, { gfm: true });
  // Keep requirement and test IDs (FR-01, AC-12, TEST-20b, CC-01 …) on one line; skip Mermaid sources.
  const idRe = /\b(?:FR|BR|NFR|AC|TEST|CC|F|D|Q|A|P)-\d+[a-z]?\b/g;
  html = html
    .split(/(<pre><code class="language-mermaid">[\s\S]*?<\/code><\/pre>)/)
    .map((seg, i) => (i % 2 ? seg : seg.replace(/>([^<]+)</g, (_, txt) => ">" + txt.replace(idRe, (id) => `<span class="id">${id}</span>`) + "<")))
    .join("");
  html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
  return html;
}

// ---------------------------------------------------------------- AC → test → result table
function acResultsTable() {
  const ev = path.join(repo, "docs", "evidence", "release");
  const rows = [];
  for (const [file, kind] of [["server.txt", "server"], ["client.txt", "client"], ["e2e.txt", "e2e"]]) {
    const p = path.join(ev, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const vitest = line.match(/^\s*([✓×↓])\s+(tests\/\S+)\s+>\s+(.*?)(?:\s+\d+ms)?$/);
      const pw = line.match(/^\s*(ok|x)\s+\d+\s+\[chromium\]\s+›\s+(\S+?):\d+:\d+\s+›\s+(.*?)(?:\s+\(\d+(?:\.\d+)?m?s\))?$/);
      const m = vitest || pw;
      if (!m) continue;
      const status = m[1] === "✓" || m[1] === "ok" ? "Pass" : m[1] === "↓" ? "Skipped" : "Fail";
      const file2 = `${kind === "e2e" ? "" : kind + "/"}${m[2].replace(/\\/g, "/")}`;
      const name = m[3].split(" > ").pop();
      const acs = name.match(/AC-\d+/g) || [];
      const test = (name.match(/TEST-[A-Z0-9-]+[a-z]?/) || [""])[0].replace(/-$/, "");
      for (const ac of acs) rows.push({ ac, test, file: file2, name, status });
    }
  }
  const byAc = new Map();
  for (let i = 1; i <= 33; i++) byAc.set(`AC-${String(i).padStart(2, "0")}`, []);
  for (const r of rows) byAc.get(r.ac)?.push(r);
  let html = '<table class="ac"><thead><tr><th>AC</th><th>Test ID</th><th>File</th><th>Test name (as run)</th><th>Result</th></tr></thead><tbody>';
  let missing = 0;
  for (const [ac, list] of byAc) {
    if (list.length === 0) {
      missing++;
      html += `<tr><td class="id">${ac}</td><td colspan="3"><i>No automated test name references this AC — see the feature contract / manual checks</i></td><td>—</td></tr>`;
      continue;
    }
    list.forEach((r, i) => {
      html += `<tr>${i === 0 ? `<td class="id" rowspan="${list.length}">${ac}</td>` : ""}<td class="id">${esc(r.test)}</td><td><code>${esc(r.file)}</code></td><td>${esc(r.name)}</td><td class="${r.status === "Pass" ? "pass" : "fail"}">${r.status}</td></tr>`;
    });
  }
  html += "</tbody></table>";
  return { html, missing, count: rows.length };
}

// ---------------------------------------------------------------- document assembly
const entries = []; // { key, level, label }
let mk = 0;
const marker = (key) => `<span class="mk">@@${key}@@</span>`;

function buildBody() {
  let body = "";
  for (const part of config.parts) {
    const pkey = `P${part.id}`;
    entries.push({ key: pkey, level: 1, label: `Part ${part.id} — ${part.title}`, part: part.id });
    body += `<h1 class="part">${marker(pkey)}Part ${part.id} — ${esc(part.title)}</h1>`;
    for (const rel of part.files) {
      let md = simplifyMath(read(rel));
      const title = (md.match(/^# (.+)$/m) || [null, path.basename(rel)])[1];
      const key = `D${++mk}`;
      entries.push({ key, level: 2, label: plain(title), part: part.id });
      md = demoteHeadings(md);
      let html = render(md);
      html = html.replace(/<h2([^>]*)>/, `<h2$1>${marker(key)}`);
      if (html.includes("<!-- AC_RESULTS_TABLE -->")) {
        const t = acResultsTable();
        html = html.replace("<!-- AC_RESULTS_TABLE -->", t.html);
        console.log(`AC table: ${t.count} test↔AC links, ${t.missing} AC without an automated test name`);
      }
      body += `<section class="doc"><div class="src">Source: <code>${esc(path.relative(repo, path.resolve(here, rel)).replace(/\\/g, "/"))}</code></div>${html}</section>`;
    }
  }
  return body;
}

function frontPage(pages, total) {
  const fm = render(read(config.frontMatter)).replace(/<thead>[\s\S]*?<\/thead>/, "");
  const partPages = (id) => {
    const start = pages[`P${id}`];
    const idx = config.parts.findIndex((p) => p.id === id);
    const next = config.parts[idx + 1];
    const end = next ? pages[`P${next.id}`] - 1 : total;
    return start ? `${start}–${end}` : "–";
  };
  let nav = '<table class="nav"><thead><tr><th>Part</th><th>Pages</th><th>Contents and IDs</th></tr></thead><tbody>';
  for (const p of config.parts) nav += `<tr><td><b>${p.id}</b> ${esc(p.title)}</td><td>${partPages(p.id)}</td><td>${esc(p.ids)}</td></tr>`;
  nav += "</tbody></table>";
  let toc = '<table class="toc"><tbody>';
  for (const e of entries) toc += `<tr class="l${e.level}"><td>${esc(e.label)}</td><td>${pages[e.key] ?? "–"}</td></tr>`;
  toc += "</tbody></table>";
  return `<div class="cover"><h1 class="title">${esc(config.title)}</h1>${fm}
    <h2>Navigation</h2>${nav}
    <p class="note">Page references are to this PDF. The repository holds the same documents; this PDF is self-contained for grading.</p></div>
    <div class="contents"><h2>Contents</h2>${toc}</div>`;
}

const css = `
@page { size: A4; margin: 16mm 14mm 18mm 14mm; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 9.6pt; line-height: 1.38; color: #1d1d1f; }
h1.title { font-size: 19pt; margin: 0 0 10px; }
h1.part { page-break-before: always; font-size: 18pt; border-bottom: 3px solid #1f4e79; padding-bottom: 4px; color: #1f4e79; }
h2 { font-size: 14pt; margin: 18px 0 6px; color: #1f4e79; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 14px 0 4px; break-after: avoid; }
h4, h5, h6 { font-size: 10pt; margin: 10px 0 4px; break-after: avoid; }
section.doc { margin-top: 6px; }
section.doc + section.doc { page-break-before: always; }
.src { font-size: 7.5pt; color: #777; margin-bottom: -6px; }
table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 8.2pt; }
th, td { border: 1px solid #b9c2cc; padding: 3px 5px; vertical-align: top; text-align: left; overflow-wrap: break-word; }
th { background: #e8eef4; }
tr { break-inside: avoid; }
code { font-family: Consolas, "Courier New", monospace; font-size: 8.2pt; background: #f2f4f6; padding: 0 2px; }
pre { background: #f6f8fa; border: 1px solid #dde2e6; padding: 6px 8px; white-space: pre-wrap; word-break: break-word; font-size: 8pt; break-inside: avoid; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #b9c2cc; margin: 6px 0; padding: 2px 10px; color: #444; }
.mermaid { text-align: center; margin: 8px 0; break-inside: avoid; }
.mermaid svg { max-width: 100%; max-height: 215mm; height: auto; width: auto; }
.mk { color: #fff; font-size: 1px; }
.id { white-space: nowrap; }
.cover table.nav td:nth-child(2) { white-space: nowrap; text-align: center; width: 52px; }
.note { font-size: 8pt; color: #555; }
.contents { page-break-before: always; }
table.toc td { border: none; border-bottom: 1px dotted #c8ced4; padding: 2px 4px; }
table.toc td:last-child { text-align: right; width: 40px; }
table.toc tr.l1 td { font-weight: 600; padding-top: 7px; }
table.toc tr.l2 td:first-child { padding-left: 18px; }
td.pass { color: #1b6e2d; font-weight: 600; } td.fail { color: #b00020; font-weight: 600; }
.todo { border: 2px dashed #d39b00; background: #fff8e1; padding: 6px 10px; margin: 8px 0; font-size: 9pt; }
`;

function page(body, pages, total) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${frontPage(pages, total)}${body}</body></html>`;
}

async function renderPdf(browser, html, file) {
  const p = await browser.newPage();
  await p.setContent(html, { waitUntil: "load" });
  await p.addScriptTag({ path: path.join(here, "node_modules", "mermaid", "dist", "mermaid.min.js") });
  const errors = await p.evaluate(async () => {
    /* global mermaid */
    mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict", flowchart: { useMaxWidth: true } });
    const problems = [];
    let n = 0;
    for (const el of document.querySelectorAll(".mermaid")) {
      const src = el.textContent;
      try {
        const { svg } = await mermaid.render(`mmd${n++}`, src);
        el.innerHTML = svg;
      } catch (e) {
        problems.push(String(e && (e.message || e.str || e)).slice(0, 300));
        el.outerHTML = `<pre>${src.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
      }
    }
    return problems;
  });
  if (errors.length) console.warn(`Mermaid: ${errors.length} diagram(s) failed and are shown as text:\n  - ${errors.join("\n  - ")}`);
  await p.pdf({
    path: file,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="font-size:7.5px;width:100%;text-align:center;color:#666;font-family:Segoe UI,Arial">CPE 334 Deliverable 1 · Theme 8 · v0.1.0-sprint1 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });
  await p.close();
}

function pageMap(file) {
  const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const pages = text.split("\f");
  const map = {};
  pages.forEach((t, i) => {
    for (const m of t.matchAll(/@@([A-Z]\d*|P[A-Z])@@/g)) if (!(m[1] in map)) map[m[1]] = i + 1;
  });
  return { map, total: pages.filter((t, i) => i < pages.length - 1 || t.trim()).length };
}

// ---------------------------------------------------------------- main
fs.mkdirSync(outDir, { recursive: true });
const body = buildBody();
const browser = await chromium.launch();
const tmp = path.join(outDir, "pass.pdf");
let pages = {};
let total = 0;
for (let pass = 1; pass <= 3; pass++) {
  await renderPdf(browser, page(body, pages, total), tmp);
  const r = pageMap(tmp);
  const stable = JSON.stringify(r.map) === JSON.stringify(pages) && r.total === total;
  pages = r.map;
  total = r.total;
  console.log(`pass ${pass}: ${total} pages`);
  if (stable) break;
}
await browser.close();
fs.copyFileSync(tmp, outPdf);
fs.rmSync(tmp);

const missingKeys = entries.filter((e) => !pages[e.key]).map((e) => e.label);
if (missingKeys.length) console.warn("WARNING: page not found for:", missingKeys.join("; "));
const todos = (body.match(/class="todo"/g) || []).length;
console.log(`Wrote ${path.relative(repo, outPdf)} — ${total} pages; ${todos} TODO box(es) still to fill`);
for (const p of config.parts) console.log(`  Part ${p.id}: page ${pages["P" + p.id]}`);
