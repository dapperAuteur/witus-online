#!/usr/bin/env node
// One-command propagation of a rules change from THIS repo to every ecosystem repo.
//
// Workflow going forward, when you add or change a rule:
//   1. Edit docs/shared-rules.md (or docs/shared-ui-ux-dx.md — that one is pointer-only and needs
//      no propagation; repos read it live).
//   2. node scripts/propagate-claude-rules.mjs          # preview what would change
//   3. node scripts/propagate-claude-rules.mjs --write  # write the block into every repo, then
//                                                          branch + commit + push each changed repo
//   4. You merge each pushed branch (this script NEVER merges — branch-hygiene rule).
//
// It wraps sync-claude-rules.mjs (which writes the managed block) and then does the per-repo git so
// you don't hand-commit 19 repos. A repo is touched only if its CLAUDE.md actually changed.
//
// Safety: a repo is skipped (not committed) if it isn't on main/master or the update branch, so
// in-progress work on a feature branch is never entangled. Only CLAUDE.md is staged.

import { execFileSync, execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const WRITE = process.argv.includes("--write");
const DATE = new Date().toISOString().slice(0, 10);
const BRANCH = `chore/update-shared-rules-${DATE}`;

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
}
function gitQuiet(repo, args) {
  try {
    return { ok: true, out: git(repo, args) };
  } catch (e) {
    return { ok: false, out: (e.stderr || e.stdout || String(e)).toString().trim() };
  }
}

// Step 1 — write (or preview) the managed block into every target via the sync script.
console.log(`\n=== Step 1: sync managed block (${WRITE ? "writing" : "dry-run"}) ===`);
execSync(`node ${JSON.stringify(join(HERE, "sync-claude-rules.mjs"))}${WRITE ? " --write" : ""}`, {
  cwd: ROOT,
  stdio: "inherit",
});

if (!WRITE) {
  console.log(
    "\nPreview only. Re-run with --write to write the block AND branch/commit/push each changed repo."
  );
  process.exit(0);
}

// Step 2 — for each target whose CLAUDE.md changed, branch + commit + push.
console.log(`\n=== Step 2: branch + commit + push changed repos (branch ${BRANCH}) ===`);
const manifest = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));

const pushed = [];
const skipped = [];
const upToDate = [];

for (const repo of manifest.targets) {
  const name = basename(repo);
  if (!existsSync(repo)) {
    skipped.push([name, "repo path missing"]);
    continue;
  }
  // Did CLAUDE.md actually change?
  const status = gitQuiet(repo, ["status", "--porcelain", "--", "CLAUDE.md"]);
  if (!status.ok) {
    skipped.push([name, `git status failed: ${status.out}`]);
    continue;
  }
  if (status.out === "") {
    upToDate.push(name);
    continue;
  }
  // Only proceed from main/master or an existing update branch — never entangle feature work.
  const cur = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const onSafeBase = cur === "main" || cur === "master" || cur === BRANCH;
  if (!onSafeBase) {
    skipped.push([name, `on branch '${cur}' (not main/${BRANCH}); commit that work first`]);
    continue;
  }
  // Create or switch to the update branch.
  if (cur !== BRANCH) {
    const exists = gitQuiet(repo, ["rev-parse", "--verify", "--quiet", BRANCH]).ok;
    const co = gitQuiet(repo, exists ? ["checkout", BRANCH] : ["checkout", "-b", BRANCH]);
    if (!co.ok) {
      skipped.push([name, `checkout failed: ${co.out}`]);
      continue;
    }
  }
  const add = gitQuiet(repo, ["add", "CLAUDE.md"]);
  if (!add.ok) {
    skipped.push([name, `git add failed (gitignored?): ${add.out}`]);
    continue;
  }
  const msg =
    "chore: update witus shared-rules block\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>";
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
console.log(`Pushed (${pushed.length}) on '${BRANCH}': ${pushed.join(", ") || "—"}`);
console.log(`Up-to-date (${upToDate.length}): ${upToDate.join(", ") || "—"}`);
if (skipped.length) {
  console.log(`Skipped (${skipped.length}):`);
  for (const [n, why] of skipped) console.log(`  - ${n}: ${why}`);
}
if (pushed.length) {
  console.log(`\nNext: merge the '${BRANCH}' branch in each of the ${pushed.length} pushed repos.`);
}
