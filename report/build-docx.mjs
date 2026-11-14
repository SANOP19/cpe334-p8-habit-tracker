// Builds report/out/Deliverable1-Theme8.docx from the same sources as build.mjs (sections.json).
// Word headings feed the Table of Contents; bookmarks + PAGEREF fields give the navigation page ranges.
// Fields are filled in when Word updates them (update-docx.ps1 does this and exports the PDF).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { chromium } from "@playwright/test";
import {
  AlignmentType, BorderStyle, Bookmark, Document, ExternalHyperlink, Footer, HeadingLevel, ImageRun, LevelFormat,
  Packer, PageNumber, PageReference, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun,
  WidthType, PageBreak,
} from "docx";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const outDir = path.join(here, "out");
fs.mkdirSync(outDir, { recursive: true });
const config = JSON.parse(fs.readFileSync(path.join(here, "sections.json"), "utf8"));
const read = (rel) => fs.readFileSync(path.resolve(here, rel), "utf8").replace(/\r\n/g, "\n");

const FONT = "Calibri";
const MONO = "Consolas";
const TEXT_W = 9638; // A4 width minus 2 × 1134 DXA margins
const MAX_IMG_W = 620; // px
const MAX_IMG_H = 800; // px
const BODY = 20; // half-points (10 pt)
const SMALL = 16; // 8 pt

// ---------------------------------------------------------------- helpers
function simplifyMath(md) {
  const sym = (s) => s.replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\ge(q)?/g, "≥").replace(/\\le(q)?/g, "≤")
    .replace(/\\rightarrow/g, "→").replace(/\\times/g, "×").replace(/\\,/g, " ").trim();
  return md.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => "`" + sym(m) + "`").replace(/\$([^$\n]*\\[^$\n]*)\$/g, (_, m) => sym(m));
}
function demote(md) {
  let fence = false;
  return md.split("\n").map((l) => { if (/^```/.test(l)) fence = !fence; return !fence && /^#{1,5} /.test(l) ? "#" + l : l; }).join("\n");
}
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function fit({ w, h }, maxW = MAX_IMG_W, maxH = MAX_IMG_H) {
  const s = Math.min(1, maxW / w, maxH / h);
  return { width: Math.round(w * s), height: Math.round(h * s) };
}
const HEADING = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];

// ---------------------------------------------------------------- inline tokens → runs
function runs(tokens = [], style = {}) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case "text":
        if (t.tokens) out.push(...runs(t.tokens, style));
        else out.push(new TextRun({ text: decode(t.text), ...style }));
        break;
      case "escape":
        out.push(new TextRun({ text: decode(t.text), ...style }));
        break;
      case "strong":
        out.push(...runs(t.tokens, { ...style, bold: true }));
        break;
      case "em":
        out.push(...runs(t.tokens, { ...style, italics: true }));
        break;
      case "del":
        out.push(...runs(t.tokens, { ...style, strike: true }));
        break;
      case "codespan":
        out.push(new TextRun({ text: decode(t.text), ...style, font: MONO, size: (style.size || BODY) - 2, shading: { type: ShadingType.CLEAR, fill: "F0F2F4" } }));
        break;
      case "br":
        out.push(new TextRun({ text: "", break: 1, ...style }));
        break;
      case "link":
        if (/^https?:/.test(t.href)) out.push(new ExternalHyperlink({ link: t.href, children: runs(t.tokens, { ...style, color: "1F4E79", underline: {} }) }));
        else out.push(...runs(t.tokens, style));
        break;
      case "html":
        if (/<br\s*\/?>/i.test(t.text)) out.push(new TextRun({ text: "", break: 1, ...style }));
        else if (!/^<!--/.test(t.text.trim())) out.push(new TextRun({ text: decode(t.text.replace(/<[^>]+>/g, "")), ...style }));
        break;
      case "image":
        break; // handled at paragraph level
      default:
        if (t.text) out.push(new TextRun({ text: decode(t.text), ...style }));
    }
  }
  return out;
}

// ---------------------------------------------------------------- block tokens → docx elements
const mermaidQueue = []; // { src, file }
let mermaidN = 0;

function table(t) {
  const cols = t.header.length;
  const len = (cell) => Math.min(60, Math.max(4, (cell.text || "").replace(/`/g, "").length));
  const weights = t.header.map((h, i) => Math.max(len(h), ...t.rows.map((r) => len(r[i] || { text: "" }))));
  const total = weights.reduce((a, b) => a + b, 0);
  let widths = weights.map((w) => Math.max(Math.round((w / total) * TEXT_W), 700));
  const scale = TEXT_W / widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.floor(w * scale));
  widths[cols - 1] += TEXT_W - widths.reduce((a, b) => a + b, 0);
  const cell = (c, i, header) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: header ? { type: ShadingType.CLEAR, fill: "E8EEF4" } : undefined,
      margins: { top: 40, bottom: 40, left: 70, right: 70 },
      children: [new Paragraph({ children: runs(c.tokens, { size: SMALL, bold: header || undefined }) })],
    });
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      ...(t.header.every((h) => !h.text.trim()) ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: t.header.map((c, i) => cell(c, i, true)) })]),
      ...t.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

function blocks(tokens, ctx) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading": {
        const level = Math.min(t.depth, 6);
        const children = runs(t.tokens);
        const para = new Paragraph({
          heading: HEADING[level],
          pageBreakBefore: level === 2 && ctx.breakBeforeDocTitle,
          children: ctx.docKey && level === 2 && !ctx.usedDocKey ? [new Bookmark({ id: ctx.docKey, children })] : children,
        });
        if (level === 2) ctx.usedDocKey = true;
        out.push(para);
        break;
      }
      case "paragraph": {
        const img = t.tokens.find((x) => x.type === "image");
        if (img && t.tokens.filter((x) => x.type !== "text" || x.text.trim()).length === 1) {
          const file = path.resolve(here, img.href);
          const size = fit(pngSize(file));
          out.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [new ImageRun({ type: "png", data: fs.readFileSync(file), transformation: size })] }));
          out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: decode(img.text), italics: true, size: 17, color: "444444" })] }));
        } else {
          out.push(new Paragraph({ spacing: { after: 100 }, children: runs(t.tokens) }));
        }
        break;
      }
      case "list": {
        const ref = t.ordered ? "num" : "bullet";
        const inst = t.ordered ? ++ctx.listInstance : 0;
        const walk = (list, level) => {
          for (const item of list.items) {
            const inline = [];
            const nested = [];
            for (const sub of item.tokens) {
              if (sub.type === "list") nested.push(sub);
              else if (sub.type === "text" || sub.type === "paragraph") inline.push(...(sub.tokens || [{ type: "text", text: sub.text }]));
            }
            out.push(new Paragraph({ numbering: { reference: ref, level, instance: inst }, spacing: { after: 40 }, children: runs(inline) }));
            for (const n of nested) walk(n, Math.min(level + 1, 2));
          }
        };
        walk(t, 0);
        break;
      }
      case "table":
        out.push(table(t));
        out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
        break;
      case "code": {
        if (t.lang === "mermaid") {
          const seqInit = '%%{init: {"sequence": {"width": 190, "height": 40, "actorMargin": 50, "boxMargin": 8, "messageMargin": 30, "wrap": false, "messageFontSize": 14, "noteFontSize": 14, "actorFontSize": 14, "mirrorActors": false}}}%%' + String.fromCharCode(10);
          let parts = [t.text];
          if (/^\s*sequenceDiagram/.test(t.text)) {
            const ls = t.text.split(String.fromCharCode(10));
            const firstNote = ls.findIndex((l) => /^\s*Note over/.test(l));
            const header = ls.slice(0, firstNote).join(String.fromCharCode(10));
            const bodies = [];
            for (const l of ls.slice(firstNote)) { if (/^\s*Note over/.test(l)) bodies.push([]); bodies[bodies.length - 1].push(l); }
            parts = bodies.map((bd) => seqInit + header + String.fromCharCode(10) + bd.join(String.fromCharCode(10)));
          }
          for (const src of parts) {
            const file = path.join(outDir, `mermaid-${++mermaidN}.png`);
            mermaidQueue.push({ src, file });
            out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `@@MERMAID:${file}@@` })] }));
          }
          break;
        }
        for (const line of t.text.split("\n")) {
          out.push(new Paragraph({ spacing: { after: 0, line: 240 }, shading: { type: ShadingType.CLEAR, fill: "F6F8FA" }, children: [new TextRun({ text: line || " ", font: MONO, size: 16 })] }));
        }
        out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
        break;
      }
      case "blockquote":
        for (const b of blocks(t.tokens, ctx)) out.push(b);
        break;
      case "hr":
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "B9C2CC", space: 1 } }, children: [] }));
        break;
      case "html":
        if (t.text.includes("AC_RESULTS_TABLE")) out.push(acTable());
        break;
      case "space":
        break;
      default:
        if (t.tokens) out.push(new Paragraph({ children: runs(t.tokens) }));
    }
  }
  return out;
}

// ---------------------------------------------------------------- AC → test → result table (from the recorded release run)
function acTable() {
  const ev = path.join(repo, "docs", "evidence", "release");
  const rows = [];
  for (const [file, kind] of [["server.txt", "server"], ["client.txt", "client"], ["e2e.txt", "e2e"]]) {
    for (const line of fs.readFileSync(path.join(ev, file), "utf8").split(/\r?\n/)) {
      const v = line.match(/^\s*([✓×↓])\s+(tests\/\S+)\s+>\s+(.*?)(?:\s+\d+ms)?$/);
      const p = line.match(/^\s*(ok|x)\s+\d+\s+\[chromium\]\s+›\s+(\S+?):\d+:\d+\s+›\s+(.*?)(?:\s+\(\d+(?:\.\d+)?m?s\))?$/);
      const m = v || p;
      if (!m) continue;
      const name = m[3].split(" > ").pop();
      for (const ac of name.match(/AC-\d+/g) || []) {
        rows.push({ ac, test: (name.match(/TEST-[A-Z0-9-]+[a-z]?/) || [""])[0], file: `${kind === "e2e" ? "" : kind + "/"}${m[2].replace(/\\/g, "/")}`, name, ok: m[1] === "✓" || m[1] === "ok" });
      }
    }
  }
  rows.sort((a, b) => a.ac.localeCompare(b.ac, "en", { numeric: true }));
  const md = ["| AC | Test ID | File | Test name (as run) | Result |", "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.ac} | ${r.test || "—"} | \`${r.file}\` | ${r.name.replace(/\|/g, "/")} | ${r.ok ? "Pass" : "Fail"} |`)].join("\n");
  const missing = Array.from({ length: 33 }, (_, i) => `AC-${String(i + 1).padStart(2, "0")}`).filter((ac) => !rows.some((r) => r.ac === ac));
  console.log(`AC table: ${rows.length} rows; missing ACs: ${missing.join(", ") || "none"}`);
  return table(marked.lexer(md).find((t) => t.type === "table"));
}

// ---------------------------------------------------------------- document
const children = [];
children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(config.title)] }));
children.push(...blocks(marked.lexer(read(config.frontMatter)), { listInstance: 0 }));

children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Navigation", bold: true, size: 30, color: "1F4E79" })] }));
const navMd = ["| Part | Pages | Contents and IDs |", "|---|---|---|", ...config.parts.map((p) => `| **${p.id}** ${p.title} | PAGES_${p.id} | ${p.ids} |`)].join("\n");
const navTok = marked.lexer(navMd).find((t) => t.type === "table");
const navTable = table(navTok);
// Replace the "PAGES_X" placeholder cells with PAGEREF fields to the part's start and end bookmarks.
for (const [i, p] of config.parts.entries()) {
  const row = navTable.root.filter((r) => r.constructor.name === "TableRow")[i + 1];
  const cell = row.root.filter((c) => c.constructor.name === "TableCell")[1];
  const para = new Paragraph({ children: [new PageReference(`part${p.id}`), new TextRun({ text: "–", size: SMALL }), new PageReference(`end${p.id}`)] });
  const idx = cell.root.findIndex((x) => x.constructor.name === "Paragraph");
  cell.root[idx] = para;
}
children.push(navTable);
children.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Page references are to this document. The repository holds the same documents; this report is self-contained for grading.", size: 16, color: "555555" })] }));

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "Contents", bold: true, size: 30, color: "1F4E79" })] }));
children.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));

let listInstance = 0;
for (const part of config.parts) {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new Bookmark({ id: `part${part.id}`, children: [new TextRun(`Part ${part.id} — ${part.title}`)] })] }));
  part.files.forEach((rel, i) => {
    const md = demote(simplifyMath(read(rel)));
    const ctx = { breakBeforeDocTitle: i > 0, listInstance, docKey: null, usedDocKey: false };
    const srcLine = new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: `Source: ${path.relative(repo, path.resolve(here, rel)).replace(/\\/g, "/")}`, size: 14, color: "777777" })] });
    const els = blocks(marked.lexer(md), ctx);
    listInstance = ctx.listInstance;
    // put the source line right after the document title
    children.push(els[0], srcLine, ...els.slice(1));
  });
  children.push(new Paragraph({ children: [new Bookmark({ id: `end${part.id}`, children: [new TextRun({ text: "", size: 2 })] })] }));
}

// ---------------------------------------------------------------- render Mermaid diagrams to PNG
if (mermaidQueue.length) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1100, height: 900 } });
  await page.setContent("<html><body style='margin:0;background:#fff'><div id='d'></div></body></html>");
  await page.addScriptTag({ path: path.join(here, "node_modules", "mermaid", "dist", "mermaid.min.js") });
  await page.evaluate(() => mermaid.initialize({ startOnLoad: false, theme: "neutral", flowchart: { useMaxWidth: false } }));
  for (const [i, m] of mermaidQueue.entries()) {
    await page.evaluate(async ({ src, i }) => {
      const { svg } = await mermaid.render(`m${i}`, src);
      document.getElementById("d").innerHTML = svg;
    }, { src: m.src, i });
    await page.locator("#d svg").screenshot({ path: m.file });
  }
  await browser.close();
}

// swap placeholders for images
function resolveMermaid(list) {
  return list.map((el) => {
    if (el instanceof Paragraph) {
      const txt = JSON.stringify(el);
      const m = txt.match(/@@MERMAID:(.+?)@@/);
      if (m) {
        const file = m[1].replace(/\\\\/g, "\\");
        const size = fit(pngSize(file), MAX_IMG_W, 880);
        // device scale 2 → halve pixel size
        return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 }, children: [new ImageRun({ type: "png", data: fs.readFileSync(file), transformation: fit({ w: size.width, h: size.height }, MAX_IMG_W, 880) })] });
      }
    }
    return el;
  });
}

const doc = new Document({
  creator: "Nitithorn Ketkaew; Nara Kosiyaporn",
  title: config.title,
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: BODY } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 40, bold: true, color: "1F1F1F" }, paragraph: { spacing: { before: 0, after: 200 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 34, bold: true, color: "1F4E79" }, paragraph: { spacing: { before: 240, after: 140 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "1F4E79", space: 2 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 28, bold: true, color: "1F4E79" }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 21, bold: true }, paragraph: { spacing: { before: 160, after: 60 }, keepNext: true, outlineLevel: 3 } },
      { id: "Heading5", name: "Heading 5", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 20, bold: true, italics: true }, paragraph: { spacing: { before: 140, after: 60 }, keepNext: true, outlineLevel: 4 } },
      { id: "Heading6", name: "Heading 6", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 20, italics: true }, paragraph: { spacing: { before: 120, after: 40 }, keepNext: true, outlineLevel: 5 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullet", levels: [0, 1, 2].map((l) => ({ level: l, format: LevelFormat.BULLET, text: ["•", "◦", "▪"][l], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1), hanging: 260 } } } })) },
      { reference: "num", levels: [0, 1, 2].map((l) => ({ level: l, format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l], text: `%${l + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1), hanging: 300 } } } })) },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "CPE 334 Deliverable 1 · Theme 8 · v0.1.0-sprint1 · Page ", size: 15, color: "666666" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 15, color: "666666" }),
        new TextRun({ text: " of ", size: 15, color: "666666" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: "666666" }),
      ] })] }),
    },
    children: resolveMermaid(children),
  }],
});

const out = path.join(outDir, "Deliverable1-Theme8.docx");
fs.writeFileSync(out, await Packer.toBuffer(doc));
console.log("Wrote", path.relative(repo, out), `(${mermaidQueue.length} diagrams)`);
