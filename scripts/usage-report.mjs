#!/usr/bin/env node
// usage-report.mjs: Claude Code usage and mistake cost from the local transcripts, in credits.
//
// What it does
//   1. Reads every jsonl transcript under ~/.claude/projects (top-level session files and their
//      subagents folders). Read-only. Nothing is copied out of a transcript except token counts,
//      timestamps, model ids and file names.
//   2. Counts one API response per message id. Claude Code writes one line per content block of the
//      same response and repeats the usage on each line, so a plain sum roughly doubles the truth.
//      Input and cache fields are identical across those lines; output_tokens takes its final value
//      (the largest seen: a replayed copy of the lines can carry the initial count after the total).
//   3. Prices tokens from scripts/lib/claude-prices.json. A model id the table lacks is listed as
//      unpriced and left at zero, never guessed.
//   4. Sums the mistake ledger in plans/usage-reports/mistakes.jsonl (one row per detour with the
//      session file and the UTC window; format in scripts/lib/mistakes.example.jsonl). Rows whose
//      file is not on disk get zero and found: false.
//   5. Prints the summary, writes plans/usage-reports/latest.json, and optionally inserts a snapshot
//      row into the witus database (--push) and writes the Markdown report (--md).
//
// Credits
//   1 credit = 1 US dollar of API list price. That matches how Anthropic prices usage credits (the
//   prepaid extra usage on Pro and Max, billed at standard API rates). Usage inside the plan's
//   five-hour and weekly allowance is not billed per token at all, so every figure here is
//   API-equivalent, not what the plan charges. Anthropic's usage page and invoices are the billing record.
//
// Commands (the transcripts are global, so the absolute path works from any repo or chat)
//   node /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs            summary + latest.json
//   node /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs --push     also insert one snapshot row
//   node /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs --md       also write the Markdown report
//   npm run usage:report -- --push --md                                                      from the witus repo root
//
// Options and env
//   --push         insert into claude_usage_snapshots with the database URL from the witus .env.local
//                  (STORAGE_DATABASE_URL_UNPOOLED, DATABASE_URL_UNPOOLED, STORAGE_DATABASE_URL,
//                  DATABASE_URL; the first one set wins, same order as scripts/sync-library.mjs).
//                  The URL is never printed.
//   --dry-run      with --push: print the row that would be inserted and insert nothing
//   --md           write plans/usage-reports/<today>-token-usage-and-mistake-cost.md
//   CLAUDE_PROJECTS_DIR   transcript root (default ~/.claude/projects)
//   USAGE_REPORT_DIR      folder for latest.json, mistakes.jsonl and the Markdown report
//                         (default <witus repo>/plans/usage-reports, gitignored; created if missing)
//
// Caveats (carried from plans/usage-reports/2026-10-27-token-usage-and-mistake-cost.md)
//   - Ledger windows over-count turns that mixed a fix with other work, and under-count mistakes
//     nobody reported, sessions no longer on disk, second-order cost (BAM's time at the merge gate,
//     cloud credit, a failed SQL run) and the larger context re-reads in later turns.
//   - Local transcripts are cleaned up after cleanupPeriodDays (Claude Code default 30 days), so
//     coverage reaches back only as far as that setting allows; a pushed snapshot is the durable copy.
//   - Totals grow on every run while a session is open, because it keeps appending lines.
//   - A project dir is the directory a session was started in, not the repo the session touched.
//   - The report's own run is in the totals but in no ledger row.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CREDIT_DEFINITION,
  addUsageLine,
  aggregate,
  buildSnapshotInsert,
  computeLedger,
  fmtCredits,
  fmtInt,
  fmtPct,
  normalizePrices,
  parseLedger,
  priceFor,
  tokensOf,
} from "./lib/usage-core.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(SCRIPT_DIR);
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
if (has("--help") || has("-h")) {
  console.log("usage: node scripts/usage-report.mjs [--push [--dry-run]] [--md]\nSee the header comment of this file for what each option does.");
  process.exit(0);
}
for (const a of args) {
  if (!["--push", "--dry-run", "--md"].includes(a)) {
    console.error(`unknown option ${a}`);
    process.exit(2);
  }
}
const PUSH = has("--push");
const DRY_RUN = has("--dry-run");
const WRITE_MD = has("--md");

const transcriptRoot = process.env.CLAUDE_PROJECTS_DIR || join(process.env.HOME ?? "", ".claude", "projects");
const outDir = process.env.USAGE_REPORT_DIR || join(REPO_ROOT, "plans", "usage-reports");
const pricesPath = join(SCRIPT_DIR, "lib", "claude-prices.json");
const prices = normalizePrices(JSON.parse(readFileSync(pricesPath, "utf8")));

if (!existsSync(transcriptRoot)) {
  console.error(`transcript root not found: ${transcriptRoot} (set CLAUDE_PROJECTS_DIR)`);
  process.exit(1);
}

// ---- collect records ----------------------------------------------------------------------------
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p);
    else if (n.endsWith(".jsonl")) files.push(p);
  }
})(transcriptRoot);

const fileMetas = [];
const records = new Map();
let usageLines = 0;
for (const file of files) {
  const rel = relative(transcriptRoot, file);
  const parts = rel.split("/");
  const isSub = rel.includes("/subagents/");
  const project = parts[0];
  const session = isSub ? parts[1] : parts[parts.length - 1].replace(/\.jsonl$/, "");
  const meta = { file, rel, project, session, isSub };
  fileMetas.push(meta);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const line of text.split("\n")) {
    if (!line.includes('"usage"')) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (addUsageLine(records, parsed, meta)) usageLines++;
  }
}

// ---- ledger ---------------------------------------------------------------------------------------
const ledgerPath = join(outDir, "mistakes.jsonl");
let ledgerRows = [];
let ledgerNote = "";
if (existsSync(ledgerPath)) {
  ledgerRows = parseLedger(readFileSync(ledgerPath, "utf8"));
} else {
  ledgerNote = `no ledger at ${ledgerPath}; copy scripts/lib/mistakes.example.jsonl there and add rows`;
}

// ---- compute --------------------------------------------------------------------------------------
const agg = aggregate(records, prices);
const ledger = computeLedger(records, ledgerRows, prices, fileMetas, agg.total);
const takenAt = new Date().toISOString();
const snapshot = {
  takenAt,
  machine: hostname(),
  transcriptRoot,
  files: files.length,
  usageLines,
  coverageStart: agg.coverageStart,
  coverageEnd: agg.coverageEnd,
  credits: CREDIT_DEFINITION,
  total: agg.total,
  byMonth: agg.byMonth,
  byModel: agg.byModel,
  byProject: agg.byProject,
  unpricedModels: agg.unpricedModels,
  prices: { source: prices.source, cached: prices.cached, unit: prices.unit, models: prices.models, aliases: prices.aliases },
  ledger: { file: ledgerPath, ...ledger },
};

// ---- print summary --------------------------------------------------------------------------------
const pad = (s, n) => String(s).padStart(n);
const padR = (s, n) => String(s).padEnd(n);
const bucketLine = (label, b, w = 34) =>
  `  ${padR(label, w)} ${pad(fmtInt(b.responses), 9)} ${pad(fmtInt(b.input), 11)} ${pad(fmtInt(b.cacheWrite5m), 14)} ${pad(fmtInt(b.cacheWrite1h), 14)} ${pad(fmtInt(b.cacheRead), 16)} ${pad(fmtInt(b.output), 12)} ${pad(fmtCredits(b.usd), 11)}${b.unpriced ? ` (${b.unpriced} unpriced)` : ""}`;
const bucketHeader = (label, w = 34) =>
  `  ${padR(label, w)} ${pad("responses", 9)} ${pad("input", 11)} ${pad("cache write 5m", 14)} ${pad("cache write 1h", 14)} ${pad("cache read", 16)} ${pad("output", 12)} ${pad("credits", 11)}`;

console.log(`Claude Code usage report, taken ${takenAt} on ${snapshot.machine}`);
console.log(`Transcripts: ${transcriptRoot}: ${fmtInt(files.length)} files, ${fmtInt(usageLines)} usage lines, ${fmtInt(agg.total.responses)} API responses after de-duplication by message id`);
console.log(`Coverage: ${agg.coverageStart ?? "none"} to ${agg.coverageEnd ?? "none"}`);
console.log(`Credits: ${CREDIT_DEFINITION}. Price table cached ${prices.cached}.`);
console.log(`\nBy month\n${bucketHeader("month")}`);
for (const [k, b] of Object.entries(agg.byMonth)) console.log(bucketLine(k, b));
console.log(bucketLine("all", agg.total));
console.log(`\nBy model\n${bucketHeader("model")}`);
for (const [k, b] of Object.entries(agg.byModel)) console.log(bucketLine(priceFor(prices, k) ? k : `${k} (unpriced)`, b));
console.log(`\nBy project dir\n${bucketHeader("project dir", 52)}`);
for (const [k, b] of Object.entries(agg.byProject)) console.log(bucketLine(k, b, 52));
console.log(`\nUnpriced models: ${agg.unpricedModels.length ? agg.unpricedModels.map((u) => `${u.model} (${fmtInt(u.responses)} responses)`).join(", ") : "none"}`);

console.log(`\nMistake ledger: ${ledgerNote || `${ledgerPath}, ${ledgerRows.length} rows, ${ledger.rows.filter((r) => r.counted).length} counted`}`);
if (ledger.rows.length) {
  console.log(`  ${padR("id", 10)} ${padR("date", 10)} ${padR("repo", 28)} ${pad("responses", 9)} ${pad("tokens", 14)} ${pad("credits", 9)}  status`);
  for (const r of ledger.rows) {
    const status = !r.found ? "not_found (zero)" : r.counted ? "counted" : `not counted: ${r.reason}`;
    console.log(`  ${padR(r.id, 10)} ${padR(r.date, 10)} ${padR(r.repo.slice(0, 28), 28)} ${pad(fmtInt(r.responses), 9)} ${pad(fmtInt(r.tokens), 14)} ${pad(fmtCredits(r.usd), 9)}  ${status}`);
  }
}
console.log(`  Counted: ${fmtInt(ledger.counted.responses)} responses, ${fmtInt(tokensOf(ledger.counted))} tokens, ${fmtCredits(ledger.counted.usd)} credits, ${fmtPct(ledger.share)} of all usage (${fmtCredits(agg.total.usd)} credits)`);
console.log(`  Listed, not counted: ${fmtInt(ledger.listedNotCounted.responses)} responses, ${fmtInt(tokensOf(ledger.listedNotCounted))} tokens, ${fmtCredits(ledger.listedNotCounted.usd)} credits`);

// ---- write latest.json ----------------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
const latestPath = join(outDir, "latest.json");
writeFileSync(latestPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`\nWrote ${latestPath}`);

// ---- Markdown report ------------------------------------------------------------------------------
function markdownReport() {
  const row = (k, b) =>
    `| ${k} | ${fmtInt(b.responses)} | ${fmtInt(b.input)} | ${fmtInt(b.cacheWrite5m)} | ${fmtInt(b.cacheWrite1h)} | ${fmtInt(b.cacheRead)} | ${fmtInt(b.output)} | ${fmtCredits(b.usd)}${b.unpriced ? ` (${b.unpriced} unpriced)` : ""} |`;
  const header = (k) => `| ${k} | API responses | Input | Cache write 5m | Cache write 1h | Cache read | Output | Credits |\n|---|---:|---:|---:|---:|---:|---:|---:|`;
  const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [];
  lines.push(`# Token usage and the cost of Claude's mistakes, from local transcripts`);
  lines.push(``);
  lines.push(`Generated ${takenAt} on ${snapshot.machine} by \`scripts/usage-report.mjs --md\`. Every money figure is in **credits**: ${CREDIT_DEFINITION}. This matches how Anthropic prices usage credits (prepaid extra usage on Pro and Max, billed at standard API rates); usage inside the plan's allowance is not billed per token. Anthropic's usage page and invoices are the billing record. Every mistake figure is an estimate; section 5 says what each one includes and leaves out.`);
  lines.push(``);
  lines.push(`## 1. Coverage`);
  lines.push(``);
  lines.push(`- Transcript root: \`${transcriptRoot}\`, ${fmtInt(files.length)} jsonl files (top-level sessions plus subagent files).`);
  lines.push(`- Usage lines: ${fmtInt(usageLines)}; distinct API responses after de-duplication by message id: ${fmtInt(agg.total.responses)}.`);
  lines.push(`- Earliest usage timestamp on disk: ${agg.coverageStart ?? "none"}; latest: ${agg.coverageEnd ?? "none"}. Nothing before the earliest date exists locally; Claude Code deletes transcripts after \`cleanupPeriodDays\` (default 30 days), so a pushed snapshot is the durable copy.`);
  lines.push(`- A project dir is the working directory the session was started in, not the repo the session touched.`);
  lines.push(``);
  lines.push(`## 2. Price table used`);
  lines.push(``);
  lines.push(`Source: ${prices.source} Cached ${prices.cached}. Unit: ${prices.unit}.`);
  lines.push(``);
  lines.push(`| Model id | Input | Cache write 5m | Cache write 1h | Cache read | Output |\n|---|---:|---:|---:|---:|---:|`);
  for (const [id, p] of Object.entries(prices.models)) lines.push(`| ${id} | ${p.input} | ${p.cacheWrite5m} | ${p.cacheWrite1h} | ${p.cacheRead} | ${p.output} |`);
  for (const [alias, target] of Object.entries(prices.aliases)) lines.push(`| ${alias} | priced as ${target} | | | | |`);
  lines.push(``);
  lines.push(`Model ids in the transcripts that the table lacks (unpriced, counted as zero): ${agg.unpricedModels.length ? agg.unpricedModels.map((u) => `\`${u.model}\` (${fmtInt(u.responses)} responses)`).join(", ") : "none"}.`);
  lines.push(``);
  lines.push(`## 3. Totals`);
  lines.push(``);
  lines.push(`### By month\n\n${header("Month")}`);
  for (const [k, b] of Object.entries(agg.byMonth)) lines.push(row(k, b));
  lines.push(row("All", agg.total));
  lines.push(``);
  lines.push(`### By model\n\n${header("Model")}`);
  for (const [k, b] of Object.entries(agg.byModel)) lines.push(row(priceFor(prices, k) ? k : `${k} (unpriced)`, b));
  lines.push(``);
  lines.push(`### By project dir\n\n${header("Project dir")}`);
  for (const [k, b] of Object.entries(agg.byProject)) lines.push(row(k, b));
  lines.push(``);
  lines.push(`## 4. Mistake ledger`);
  lines.push(``);
  lines.push(`Ledger file: \`${ledgerPath}\` (${ledgerRows.length} rows). Each row is a window of one session's transcript, summed with the same de-duplication as the totals. Scope "main" is the session's top-level file; "with-subagents" adds the files under its subagents folder. A row whose transcript is not on disk is shown as not found with zero, not estimated. Tokens are input plus cache write plus cache read plus output.`);
  lines.push(``);
  lines.push(`| Id | Date | Repo | What went wrong | Reported | Session, window, scope | Responses | Tokens | Credits | Counted |\n|---|---|---|---|---|---|---:|---:|---:|---|`);
  for (const r of ledger.rows) {
    const win = r.start || r.end ? `${r.start ?? ""} to ${r.end ?? ""}` : "whole file";
    const counted = !r.found ? "not found (zero)" : r.counted ? "yes" : `no: ${esc(r.reason)}`;
    lines.push(`| ${r.id} | ${r.date} | ${esc(r.repo)} | ${esc(r.description)} | ${esc(r.reported)} | ${esc(r.session)}, ${win}, ${r.scope} | ${fmtInt(r.responses)} | ${fmtInt(r.tokens)} | ${fmtCredits(r.usd)} | ${counted} |`);
  }
  lines.push(``);
  lines.push(`## 5. Ledger totals and share of all usage`);
  lines.push(``);
  lines.push(`| Set | API responses | Tokens | Output tokens | Credits | Share of all usage (credits) | Share of all usage (tokens) |\n|---|---:|---:|---:|---:|---:|---:|`);
  const allTok = tokensOf(agg.total);
  const shareRow = (name, b) => `| ${name} | ${fmtInt(b.responses)} | ${fmtInt(tokensOf(b))} | ${fmtInt(b.output)} | ${fmtCredits(b.usd)} | ${fmtPct(agg.total.usd ? b.usd / agg.total.usd : 0)} | ${fmtPct(allTok ? tokensOf(b) / allTok : 0)} |`;
  lines.push(shareRow("Counted ledger rows", ledger.counted));
  lines.push(shareRow("Listed, not counted (origins, adjacent, not on disk)", ledger.listedNotCounted));
  lines.push(`| All usage in local transcripts | ${fmtInt(agg.total.responses)} | ${fmtInt(allTok)} | ${fmtInt(agg.total.output)} | ${fmtCredits(agg.total.usd)} | 100% | 100% |`);
  lines.push(``);
  lines.push(`What these totals are and are not:`);
  lines.push(``);
  lines.push(`- They **over-count** turns that mixed a fix with other work: a window carries every response between the report and the fix, including context re-reads for unrelated items in the same turn.`);
  lines.push(`- They **under-count** mistakes nobody reported, mistakes reported in sessions that are no longer on disk, the second-order cost of a mistake (BAM's time at the merge gate, cloud-session credit, a failed SQL run), and the larger context re-reads in later turns because the fix history sat in the window.`);
  lines.push(`- They include this report's own run in the "All usage" row but in no ledger row.`);
  lines.push(`- The share is of local transcripts only. Sessions deleted by the transcript cleanup would make the denominator larger and the share smaller.`);
  lines.push(``);
  lines.push(`## 6. How to re-run`);
  lines.push(``);
  lines.push("```sh\nnode /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs            # summary + latest.json\nnode /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs --push     # also insert a snapshot row for /admin/usage\nnode /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs --md       # also rewrite this report\n```");
  lines.push(``);
  lines.push(`The ledger rule: when BAM reports a mistake, the session appends a row to \`mistakes.jsonl\` with the session file and the window before it fixes anything else. Format: \`scripts/lib/mistakes.example.jsonl\`.`);
  lines.push(``);
  return lines.join("\n");
}

if (WRITE_MD) {
  const mdPath = join(outDir, `${takenAt.slice(0, 10)}-token-usage-and-mistake-cost.md`);
  writeFileSync(mdPath, markdownReport());
  console.log(`Wrote ${mdPath}`);
}

// ---- push -------------------------------------------------------------------------------------------
if (PUSH) {
  const { text, values } = buildSnapshotInsert(snapshot);
  if (DRY_RUN) {
    console.log(`\nDry run: would run\n  ${text}\n  with ${values.length} values (detail ${values[values.length - 1].length} bytes of JSON); first values: ${values.slice(0, 4).join(", ")}; totals ${values.slice(4, 13).join(", ")}`);
  } else {
    const { config: loadEnv } = await import("dotenv");
    const { neon } = await import("@neondatabase/serverless");
    // Only the witus repo's own .env.local, never the current directory's: the command runs from
    // any repo, and another repo's database must never receive this row.
    loadEnv({ path: join(REPO_ROOT, ".env.local"), quiet: true });
    const dbUrl =
      process.env.STORAGE_DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.STORAGE_DATABASE_URL ??
      process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error(`No database URL in ${join(REPO_ROOT, ".env.local")} (STORAGE_DATABASE_URL / DATABASE_URL, or their _UNPOOLED variants).`);
      process.exit(1);
    }
    const sql = neon(dbUrl);
    try {
      const rows = await sql.query(text, values);
      const inserted = rows[0] ?? rows.rows?.[0];
      console.log(`\nInserted claude_usage_snapshots row ${inserted?.id ?? "(id not returned)"} at ${inserted?.taken_at ?? takenAt}. Open https://www.witus.online/admin/usage.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/relation .* does not exist/i.test(msg)) {
        console.error(`Push failed: the claude_usage_snapshots table is missing. Apply the migration first (npm run db:migrate from the witus repo root). ${msg}`);
      } else {
        console.error(`Push failed: ${msg}`);
      }
      process.exit(1);
    }
  }
}
