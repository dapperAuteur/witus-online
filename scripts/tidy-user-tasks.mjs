#!/usr/bin/env node
/**
 * Move operator tasks that are already closed in their index (Status says done) but whose file is
 * still in plans/user-tasks/ root into plans/user-tasks/completed/, and repoint the index link.
 * Uses the same reader as scripts/sync-user-tasks.mjs, so "closed" means exactly what the sync and
 * /admin/tasks mean by it (lib/operator-tasks/core.mjs, isClosedStatus).
 *
 *   node scripts/tidy-user-tasks.mjs           dry run: list what would move
 *   node scripts/tidy-user-tasks.mjs --write   move the files and update each 00-descriptions.md
 *
 * Files are moved, never deleted, so a wrong move is undone by moving the file back.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectRepo } from "./lib/user-tasks-collect.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WRITE = process.argv.includes("--write");
const repos = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));

let total = 0;
for (const path of [repos.source, ...repos.targets]) {
  const ident = { app: basename(path), appName: basename(path) };
  const c = collectRepo(path, ident);
  if (c.skipped || !c.doneInRoot.length) continue;
  const dir = join(path, "plans/user-tasks");
  const idxPath = join(dir, "00-descriptions.md");
  let idx = existsSync(idxPath) ? readFileSync(idxPath, "utf8") : null;
  console.log(`${basename(path)}: ${c.doneInRoot.length}`);
  for (const file of c.doneInRoot) {
    // "Reference" rows are runbooks that other tasks link to by path: closed, but left in place.
    const row = idx?.split("\n").find((l) => l.startsWith("|") && l.includes(file));
    const status = row ? row.split("|").slice(-2, -1)[0] ?? "" : "";
    if (/^[^\p{L}]*reference\b/iu.test(status.replace(/[*_`~]/g, "").trim())) {
      console.log(`  ${file}  (reference, left in place)`);
      continue;
    }
    total++;
    console.log(`  ${file}`);
    if (!WRITE) continue;
    mkdirSync(join(dir, "completed"), { recursive: true });
    if (existsSync(join(dir, "completed", file))) {
      console.log(`    SKIPPED: completed/${file} already exists`);
      continue;
    }
    renameSync(join(dir, file), join(dir, "completed", file));
    if (idx) idx = idx.split(`](./${file})`).join(`](./completed/${file})`).split(`](${file})`).join(`](completed/${file})`);
  }
  if (WRITE && idx) writeFileSync(idxPath, idx);
}
console.log(`${WRITE ? "Moved" : "Would move"} ${total} file(s).${WRITE ? "" : " Run with --write to move them."}`);
