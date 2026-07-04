#!/usr/bin/env node
// Stop hook: enforce the WitUS docs-sync rule.
//
// If the current branch changed feature/route source but touched NO docs, block once and ask
// Claude to update the docs in the same branch or file an explicit plans/ deferral. Schema-only
// migrations, tests, config, and plans/ notes never trigger it.
//
// Wired from .claude/settings.json as a Stop hook. Repo-agnostic — operates on git in the cwd,
// so the same file can be copied into any ecosystem repo (or ~/.claude) unchanged.
//
// Stop-hook contract: read JSON from stdin; to block, print {"decision":"block","reason":...}
// and exit 0. Always allow (exit 0, no output) when there's nothing to enforce, or on any error —
// a docs reminder must never wedge a session.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function allow() {
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

function git(args) {
  return execSync(`git ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

let input = {};
try {
  input = JSON.parse(readStdin() || "{}");
} catch {
  /* ignore malformed input */
}

// Never loop: if we already blocked once this stop cycle, let the session end.
if (input.stop_hook_active) allow();

let changed = [];
try {
  // Prefer the whole-branch diff vs the base branch; fall back to working-tree changes.
  let base = "";
  for (const b of ["main", "master"]) {
    try {
      base = git(`merge-base HEAD ${b}`);
      if (base) break;
    } catch {
      /* try next */
    }
  }
  const sets = [];
  if (base) sets.push(git(`diff --name-only ${base}...HEAD`));
  sets.push(git("diff --name-only")); // unstaged
  sets.push(git("diff --name-only --cached")); // staged
  changed = [...new Set(sets.join("\n").split("\n").map((s) => s.trim()).filter(Boolean))];
} catch {
  allow(); // not a git repo, or git failed — don't enforce
}

if (changed.length === 0) allow();

const isExempt = (f) =>
  /(^|\/)plans\//.test(f) ||
  /(^|\/)\.claude\//.test(f) ||
  /\.(test|spec)\.[jt]sx?$/.test(f) ||
  /(^|\/)(migrations|drizzle)\//.test(f) ||
  /\.sql$/.test(f) ||
  /(^|\/)(node_modules|\.next|dist|build)\//.test(f) ||
  /\.(json|lock|yml|yaml|config\.[jt]s|env\.example)$/.test(f);

const isFeature = (f) =>
  !isExempt(f) &&
  /(^|\/)(app|src|components|lib|pages|api)\//.test(f) &&
  /\.[jt]sx?$/.test(f);

const isDoc = (f) =>
  /readme/i.test(f) ||
  /changelog/i.test(f) ||
  /roadmap/i.test(f) ||
  /(^|\/)docs\//.test(f) ||
  /(^|\/)help\//.test(f) ||
  /openapi/i.test(f) ||
  (/\.mdx?$/.test(f) && !/(^|\/)plans\//.test(f)) ||
  /(^|\/)(how-it-works)\//.test(f);

const featureChanges = changed.filter(isFeature);
const docChanges = changed.filter(isDoc);

if (featureChanges.length > 0 && docChanges.length === 0) {
  const list = featureChanges.slice(0, 12).map((f) => `  - ${f}`).join("\n");
  const more = featureChanges.length > 12 ? `\n  …and ${featureChanges.length - 12} more` : "";
  block(
    `Docs-sync rule: this branch changed feature/route source but no docs.\n${list}${more}\n\n` +
      `Before finishing, do ONE of:\n` +
      `  1. Update the affected docs in this branch — README (features/env/scripts), in-app ` +
      `help/tutorial, ROADMAP.md + any public roadmap page, and API docs — then commit.\n` +
      `  2. If a doc update is genuinely out of scope, file ./plans/user-tasks/NN-*.md (or a ` +
      `./plans/ note) recording the deferred doc work, then commit that.\n\n` +
      `If the diff is truly docs-exempt (schema-only migration, refactor with no user-visible ` +
      `change, perf, dev tooling), say so explicitly and stop again to proceed.`
  );
}

allow();
