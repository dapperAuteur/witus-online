#!/usr/bin/env node
/**
 * Upload every ecosystem repo's open operator tasks to witus.online (/admin/tasks), and list the
 * tasks BAM marked done on the site so the local queue can catch up.
 *
 * Operator tasks live in each repo's gitignored plans/user-tasks/ folder (Operator-task rule,
 * CLAUDE.md), so the site cannot read them; this script runs on BAM's machine. Repos come from
 * docs/ecosystem-repos.json (`source` plus `targets`); app names from lib/roadmap/registry.ts.
 *
 * Usage (from the witus repo root; .env.local must provide the site's database URL, the same one
 * scripts/sync-library.mjs uses):
 *   node scripts/sync-user-tasks.mjs             upload, then print what was marked done on the site
 *   node scripts/sync-user-tasks.mjs --check     read-only: print what was marked done on the site
 *                                                and the local drift; writes nothing
 *   node scripts/sync-user-tasks.mjs --dry-run   no database at all: parse every queue and print
 *                                                counts, withheld files and drift
 *   add --verbose to any of them to list each done task whose file is still in the folder root
 *
 * Reconcile ("marked done on the site"): BAM's "Mark done" on /admin/tasks only records the click.
 * The script prints each such task with its absolute file path; Claude moves that file to
 * completed/ and updates the index Status, and the next upload removes the row.
 *
 * Secrets: a task file that matches an obvious secret pattern (connection string with a password,
 * sk_/sb_secret_ keys, JWT-looking tokens, GitHub tokens, private keys ...; see SECRET_PATTERNS in
 * lib/operator-tasks/core.mjs) is never uploaded. Its row keeps the index text and says the body
 * was withheld; this script prints the file and line, never the value. Nothing is edited or
 * stripped: fix the file (move the value to .env.local) and run again.
 *
 * Per repo, the upload replaces that app's rows: open tasks are upserted (done marks survive) and
 * rows whose task is no longer open are deleted. A repo that is missing on this machine, or has no
 * plans/user-tasks/ folder, is skipped and its rows are left alone.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";
import { collectRepo } from "./lib/user-tasks-collect.mjs";
import { readSiteDone, replaceAppTasks } from "./lib/user-tasks-db.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const VERBOSE = args.has("--verbose");
const CHECK = args.has("--check");

if (args.has("--help") || args.has("-h")) {
  console.log("Usage: node scripts/sync-user-tasks.mjs [--check | --dry-run] [--verbose]");
  process.exit(0);
}

/** Node 22 needs --experimental-strip-types to import the .ts registry; 23.6+ doesn't. */
async function load(path) {
  try {
    return await import(path);
  } catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION" || process.env.__WITUS_REG_RESPAWN) throw err;
    const r = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
      { stdio: "inherit", env: { ...process.env, __WITUS_REG_RESPAWN: "1" } },
    );
    process.exit(r.status ?? 1);
  }
}

const { ROADMAP_APPS } = await load("../lib/roadmap/registry.ts");
const repos = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));
const repoPaths = [repos.source, ...repos.targets];

/** Registry slug and name for a repo path; the folder name when the registry has no entry. */
function identFor(path) {
  const app = ROADMAP_APPS.find((a) => a.localPath === path);
  return app ? { app: app.slug, appName: app.name } : { app: basename(path), appName: basename(path) };
}

// ── Local read ──────────────────────────────────────────────────────────────────────────────────
const collected = repoPaths.map((path) => ({ path, ident: identFor(path), ...collectRepo(path, identFor(path)) }));

let openTotal = 0;
console.log("Local queues:");
for (const c of collected) {
  if (c.skipped) {
    console.log(`  ${c.ident.app.padEnd(28)} skipped: ${c.skipped}`);
    continue;
  }
  const unindexed = c.tasks.filter((t) => t.unindexed).length;
  openTotal += c.tasks.length;
  const notes = [
    unindexed ? `${unindexed} not in the index` : "",
    c.hasIndex ? "" : "no 00-descriptions.md",
    c.withheld.length ? `${c.withheld.length} withheld` : "",
  ].filter(Boolean);
  console.log(`  ${c.ident.app.padEnd(28)} ${String(c.tasks.length).padStart(3)} open${notes.length ? `  (${notes.join(", ")})` : ""}`);
}
console.log(`  ${"total".padEnd(28)} ${String(openTotal).padStart(3)} open`);

const withheld = collected.flatMap((c) => c.withheld);
if (withheld.length) {
  console.log("\nWithheld (secret pattern; fix the file, then sync again):");
  for (const w of withheld) console.log(`  ${w.where}: ${w.what}`);
}

const drift = collected.flatMap((c) => c.drift.map((d) => `${c.ident.app}: ${d}`));
if (drift.length) {
  console.log("\nIndex drift (fix in the repo's plans/user-tasks/):");
  for (const d of drift) console.log(`  ${d}`);
}

const doneInRoot = collected.filter((c) => c.doneInRoot.length);
if (doneInRoot.length) {
  const n = doneInRoot.reduce((sum, c) => sum + c.doneInRoot.length, 0);
  console.log(`\nDone in the index but the file is still in the folder root: ${n} (not uploaded; moving them to completed/ is tidy-up${VERBOSE ? "" : ", --verbose lists them"}).`);
  for (const c of doneInRoot) {
    console.log(`  ${c.ident.app}: ${c.doneInRoot.length}${VERBOSE ? `  ${c.doneInRoot.join(", ")}` : ""}`);
  }
}

const gone = collected.filter((c) => c.gone.length);
if (gone.length) {
  const n = gone.reduce((sum, c) => sum + c.gone.length, 0);
  console.log(`\nIndex rows whose file was deleted (treated as done; set their Status): ${n}${VERBOSE ? "" : " (--verbose lists them)"}.`);
  for (const c of gone) console.log(`  ${c.ident.app}: ${c.gone.length}${VERBOSE ? `  ${c.gone.join(", ")}` : ""}`);
}

if (DRY) {
  console.log("\n--dry-run: no database read or written.");
  process.exit(0);
}

// ── Database ────────────────────────────────────────────────────────────────────────────────────
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: join(ROOT, ".env.local"), quiet: true });
loadEnv({ quiet: true });

const dbUrl =
  process.env.STORAGE_DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.STORAGE_DATABASE_URL ??
  process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("\nNo database URL found (STORAGE_DATABASE_URL / DATABASE_URL, or their _UNPOOLED variants) in .env.local.");
  process.exit(1);
}
const sql = neon(dbUrl);

function explainDbError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/relation .*operator_task.* does not exist/i.test(msg)) {
    return "The operator_task table is not in this database yet. Apply migration 0009 (docs/01-operations.md, App database migrations).";
  }
  return `Database error (${err instanceof Error ? err.name : "unknown"}): ${msg.split("\n")[0]}`;
}

try {
  const openKeys = new Set(collected.flatMap((c) => c.tasks.map((t) => t.key)));
  const done = await readSiteDone(sql);
  if (done.length) {
    console.log("\nMarked done on the site (move each file to completed/ and set its index Status):");
    for (const r of done) {
      const path = r.file ? join(r.repo_path, "plans/user-tasks", r.file) : `${r.repo_path}/plans/user-tasks/00-descriptions.md (row #${r.number})`;
      const local = openKeys.has(r.key) ? "still open locally" : "already closed locally; the upload removes the row";
      const when = r.done_at instanceof Date ? r.done_at.toISOString() : String(r.done_at);
      console.log(`  ${r.app} #${r.number ?? "?"} ${r.title}\n    ${path}\n    done ${when.slice(0, 16).replace("T", " ")} UTC by ${r.done_by ?? "?"}; ${local}`);
    }
  } else {
    console.log("\nNothing marked done on the site since the last reconcile.");
  }

  if (CHECK) {
    console.log("\n--check: nothing written.");
    process.exit(0);
  }

  let upserted = 0;
  let removed = 0;
  for (const c of collected) {
    if (c.skipped) continue;
    const r = await replaceAppTasks(sql, c.ident.app, c.tasks);
    upserted += r.upserted;
    removed += r.removed;
    for (const x of r.reconciled) console.log(`  reconciled: ${x.key} (${x.title})`);
  }
  console.log(`\nUploaded ${upserted} open tasks; removed ${removed} rows no longer open. Open https://www.witus.online/admin/tasks`);
} catch (err) {
  console.error(`\n${explainDbError(err)}`);
  process.exit(1);
}
