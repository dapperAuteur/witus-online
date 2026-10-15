#!/usr/bin/env node
// Sync the canonical Neon preview-branch cleanup workflow into every Neon-backed ecosystem repo.
//
//   node scripts/sync-preview-cleanup-workflow.mjs           # preview: which repos would change
//   node scripts/sync-preview-cleanup-workflow.mjs --write   # write the file, then branch + commit + push
//
// Same shape and the same safety rules as propagate-claude-rules.mjs: a repo is touched only if the
// file differs; it must be on main/master or on the shared update branch (the one propagate uses,
// so one merge per repo carries both the rules block and this workflow); only the workflow file is
// staged; this script never merges. Rule: docs/shared-rules.md "Preview-branch cleanup rule".
//
// Targets: docs/ecosystem-repos.json targets plus this repo, minus repos with no Neon database
// (NON_NEON below). A repo is also skipped when it has no package.json (nothing deploys from it yet).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const WRITE = process.argv.includes("--write");
const TEMPLATE = join(ROOT, ".github", "templates", "neon-preview-cleanup.yml");
const REL = join(".github", "workflows", "neon-preview-cleanup.yml");
const BRANCH = `chore/update-shared-rules-${new Date().toISOString().slice(0, 10)}`;
/** Repos in the manifest that have no Neon database (MongoDB, no DB, or docs-only). Keep in step with
 *  docs/shared-rules.md "Preview-branch cleanup rule" and plans/ecosystem/db-usage.md. */
const NON_NEON = new Set(["flashlearn-ai", "bam-landing-page", "witus-agent-evals", "create-witus"]);

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}
function gitQuiet(repo, args) {
  try {
    return { ok: true, out: git(repo, args) };
  } catch (e) {
    return { ok: false, out: String(e.stderr || e.stdout || e.message).trim() };
  }
}

const manifest = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));
const targets = [...manifest.targets, ROOT].filter((r) => !NON_NEON.has(basename(r)));
const template = readFileSync(TEMPLATE, "utf8");

const changed = [];
const upToDate = [];
const skipped = [];
for (const repo of targets) {
  const name = basename(repo);
  if (!existsSync(repo)) {
    skipped.push([name, "repo path missing"]);
    continue;
  }
  if (!existsSync(join(repo, "package.json"))) {
    skipped.push([name, "no package.json (nothing deploys yet)"]);
    continue;
  }
  const dest = join(repo, REL);
  const current = existsSync(dest) ? readFileSync(dest, "utf8") : null;
  if (current === template) {
    upToDate.push(name);
    continue;
  }
  changed.push([repo, name, current === null ? "added" : "updated"]);
}

console.log(`\n=== Neon preview-cleanup workflow (${WRITE ? "writing" : "dry-run"}) ===`);
for (const [, name, how] of changed) console.log(`  ->> ${how.padEnd(8)} ${name}`);
console.log(`\n${changed.length} repo(s) would change, ${upToDate.length} up-to-date, ${skipped.length} skipped.`);
if (!WRITE) {
  for (const [n, why] of skipped) console.log(`  - skipped ${n}: ${why}`);
  console.log("\nPreview only. Re-run with --write to write the file AND branch/commit/push each changed repo.");
  process.exit(0);
}

const pushed = [];
for (const [repo, name] of changed) {
  const cur = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const onSafeBase = cur === "main" || cur === "master" || cur === BRANCH;
  if (!onSafeBase) {
    skipped.push([name, `on branch '${cur}' (not main/${BRANCH}); commit that work first`]);
    continue;
  }
  if (cur !== BRANCH) {
    const exists = gitQuiet(repo, ["rev-parse", "--verify", "--quiet", BRANCH]).ok;
    const co = gitQuiet(repo, exists ? ["checkout", BRANCH] : ["checkout", "-b", BRANCH]);
    if (!co.ok) {
      skipped.push([name, `checkout failed: ${co.out}`]);
      continue;
    }
  }
  mkdirSync(dirname(join(repo, REL)), { recursive: true });
  writeFileSync(join(repo, REL), template);
  const add = gitQuiet(repo, ["add", REL]);
  if (!add.ok) {
    skipped.push([name, `git add failed: ${add.out}`]);
    continue;
  }
  const msg =
    "chore: delete the Neon preview branch when a PR closes (ecosystem preview-branch cleanup rule)\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>";
  const commit = gitQuiet(repo, ["commit", "-m", msg]);
  if (!commit.ok) {
    skipped.push([name, `commit failed: ${commit.out}`]);
    continue;
  }
  const push = gitQuiet(repo, ["push", "-u", "origin", BRANCH]);
  if (!push.ok) {
    skipped.push([name, `push failed: ${push.out}`]);
    continue;
  }
  pushed.push(name);
}
console.log(`\n=== Summary ===`);
console.log(`Pushed (${pushed.length}) on '${BRANCH}': ${pushed.join(", ") || "none"}`);
console.log(`Up-to-date (${upToDate.length}): ${upToDate.join(", ") || "none"}`);
if (skipped.length) {
  console.log(`Skipped (${skipped.length}):`);
  for (const [n, why] of skipped) console.log(`  - ${n}: ${why}`);
}
