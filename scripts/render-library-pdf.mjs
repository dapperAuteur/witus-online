#!/usr/bin/env node
// render-library-pdf.mjs — render plans/playbook markdown into WitUS-branded PDFs, and check freshness.
//
//   npm run library:pdf -- plans/playbook/<file>.md [--title "..."] [--subtitle "..."] [--date YYYY-MM-DD]
//   npm run library:pdf -- --all            # every playbook .md whose .pdf is missing or older than the .md
//   npm run check:pdf-freshness             # exit 1 if any playbook .md is newer than its .pdf
//
// WHY THIS EXISTS (user task 84): the library's .md/.pdf pairs drifted silently, twice, because nothing
// in this repo could render a PDF. This ports witus-learn's scripts/gen-pdfs.ts and src/lib/pdf-branding.ts
// with three changes learned the hard way on 2026-09-15:
//
//   1. Playwright drives the browser, not a hand-rolled CLI call, and the header and footer use
//      Chromium's native print templates (displayHeaderFooter) instead of `position: fixed` CSS. With the
//      Chromium build that runs on this machine, the fixed-CSS header landed at the BOTTOM of every page,
//      over the body text. Native templates also give page numbers.
//   2. The browser binary is resolved, not assumed. The installed Google Chrome (152) crashes on every
//      headless launch on this Intel Mac running macOS 13.7.8, which current Chromium no longer supports,
//      and `npx playwright install chromium` refuses the OS. What runs is an OLDER Playwright headless-shell
//      build cached under ~/Library/Caches/ms-playwright (do not delete it). Resolution order:
//      LIBRARY_PDF_BROWSER env → newest cached Playwright headless shell → Playwright's own default.
//      On a machine with a supported OS, `npx playwright install chromium` makes the default work.
//   3. Markdown is rendered by `marked` (a dependency) rather than a hand-rolled parser, so nested lists,
//      code blocks, and long tables in the ebooks render correctly.
//
// `playwright` is resolved through @playwright/test, which is a devDependency. DEV-TIME only: plans/ is
// gitignored; PDFs land beside their sources and reach the library through scripts/sync-library.mjs.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { marked } from "marked";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PLAYBOOK = join(ROOT, "plans", "playbook");

// ── Brand (ported from witus-learn/src/lib/pdf-branding.ts; wordmark re-tinted for a white page) ──
const WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="23" viewBox="0 0 180 56"><text x="4" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-size="34" font-weight="800" fill="#0f172a" letter-spacing="-0.8">WitUS</text><circle cx="120" cy="34" r="5" fill="#64748b"/></svg>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Chromium print templates ignore the page's stylesheet: every style is inline and font sizes are explicit.
const headerTemplate = (title) => `
<div style="width:100%;margin:0 16mm;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:8px;color:#6b7280;
            display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">
  <span>${WORDMARK}</span><span>${esc(title)} &middot; WitUS Library</span>
</div>`;
const footerTemplate = (generatedOn) => `
<div style="width:100%;margin:0 16mm;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:8px;color:#6b7280;
            display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:4px;">
  <span>witus.online/admin/library &middot; part of the WitUS ecosystem</span>
  <span>Generated ${esc(generatedOn)} &middot; page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;

function bodyHtml(body, { title, subtitle }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #111827; margin: 0;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: 19pt; margin: 0 0 2pt; letter-spacing: -0.4px; }
  .subtitle { color: #4b5563; font-size: 11pt; margin: 0 0 12pt; }
  h2 { font-size: 13.5pt; margin: 16pt 0 5pt; padding-bottom: 3pt; border-bottom: 1px solid #d1d5db; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 11pt 0 3pt; page-break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 9pt 0 2pt; }
  p { margin: 5pt 0; }
  ul, ol { margin: 5pt 0 5pt 17pt; padding: 0; }
  li { margin: 2pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 7pt 0; font-size: 9pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d1d5db; padding: 3.5pt 5pt; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 700; }
  code { background: #f3f4f6; padding: 1pt 3pt; border-radius: 2px; font-size: 9pt; }
  pre { background: #f3f4f6; padding: 6pt 8pt; border-radius: 3px; font-size: 8.5pt; white-space: pre-wrap; word-break: break-word; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #d1d5db; margin: 6pt 0; padding: 2pt 10pt; color: #374151; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 12pt 0; }
  strong { font-weight: 700; color: #0f172a; }
  a { color: #1d4ed8; text-decoration: none; }
</style></head><body>
<h1>${esc(title)}</h1>${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}
${body}
</body></html>`;
}

// ── Browser resolution ──────────────────────────────────────────────────────────────────────────
function cachedPlaywrightShells() {
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (!existsSync(cache)) return [];
  return readdirSync(cache)
    .filter((d) => d.startsWith("chromium_headless_shell-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1])) // newest build first
    .flatMap((d) => readdirSync(join(cache, d))
      .filter((sub) => sub.startsWith("chrome-headless-shell-"))
      .map((sub) => join(cache, d, sub, "chrome-headless-shell")))
    .filter(existsSync);
}

function resolveExecutable() {
  if (process.env.LIBRARY_PDF_BROWSER) return process.env.LIBRARY_PDF_BROWSER;
  const [newest] = cachedPlaywrightShells();
  return newest; // undefined → Playwright's own default build
}

// ── Rendering ───────────────────────────────────────────────────────────────────────────────────
async function renderOne(page, mdPath, opts = {}) {
  const src = readFileSync(mdPath, "utf8");
  const h1 = /^#\s+(.+)$/m.exec(src)?.[1]?.replace(/\s*[:—].*$/, "");
  const written = /\*\*Written:\*\*\s*(\d{4}-\d{2}-\d{2})/.exec(src)?.[1];
  const version = /\*\*Version:\*\*\s*(\d{4}-\d{2}-\d{2})/.exec(src)?.[1];
  const title = opts.title ?? h1 ?? basename(mdPath, ".md");
  // Passed in or read from the document rather than the clock, so a regenerated PDF is byte-stable.
  const generatedOn = opts.date ?? written ?? version ?? new Date().toISOString().slice(0, 10);
  const body = marked.parse(src.replace(/^#\s+.*\n/, ""), { gfm: true }); // drop the H1: the shell prints it
  const out = mdPath.replace(/\.md$/, ".pdf");

  await page.setContent(bodyHtml(body, { title, subtitle: opts.subtitle }), { waitUntil: "load" });
  await page.pdf({
    path: out,
    format: "Letter",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: headerTemplate(title),
    footerTemplate: footerTemplate(generatedOn),
    margin: { top: "24mm", right: "16mm", bottom: "20mm", left: "16mm" },
  });
  console.log(`  ok       ${basename(out)}  (${Math.round(statSync(out).size / 1024)} KB)`);
}

function playbookPairs() {
  return readdirSync(PLAYBOOK).filter((f) => f.endsWith(".md")).map((f) => {
    const md = join(PLAYBOOK, f);
    const pdf = md.replace(/\.md$/, ".pdf");
    return { md, pdf, stale: !existsSync(pdf) || statSync(md).mtimeMs > statSync(pdf).mtimeMs };
  });
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? undefined : argv[i + 1]; };

  if (argv.includes("--check")) {
    const stale = playbookPairs().filter((p) => p.stale);
    if (stale.length === 0) { console.log("All playbook PDFs are at least as new as their markdown."); return; }
    console.error("Stale or missing PDFs (markdown newer than PDF):");
    for (const p of stale) console.error("  " + basename(p.md));
    console.error("Run: npm run library:pdf -- --all");
    process.exit(1);
  }

  const targets = argv.includes("--all")
    ? playbookPairs().filter((p) => p.stale).map((p) => p.md)
    : argv.filter((a) => a.endsWith(".md")).map((a) => resolve(a));
  if (targets.length === 0) {
    if (argv.includes("--all")) { console.log("Nothing to render."); return; }
    console.error('Usage: npm run library:pdf -- <file.md> [--title "..."] [--subtitle "..."] [--date YYYY-MM-DD] | --all | --check');
    process.exit(1);
  }

  const executablePath = resolveExecutable();
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (err) {
    console.error("Could not launch a browser.", err.message.split("\n")[0]);
    console.error("On a supported OS run `npx playwright install chromium`; on this Mac (macOS 13) keep the cached headless shell,");
    console.error("or set LIBRARY_PDF_BROWSER to a Chromium binary that runs here.");
    process.exit(1);
  }
  console.log(`Rendering ${targets.length} file(s) with ${executablePath ?? "Playwright's default Chromium"}`);
  const page = await browser.newPage();
  let failures = 0;
  for (const md of targets) {
    try {
      await renderOne(page, md, argv.includes("--all") ? {} : { title: flag("--title"), subtitle: flag("--subtitle"), date: flag("--date") });
    } catch (err) {
      failures++;
      console.error(`  FAILED   ${basename(md)}: ${err.message.split("\n")[0]}`);
    }
  }
  await browser.close();
  process.exit(failures ? 1 : 0);
}

main();
