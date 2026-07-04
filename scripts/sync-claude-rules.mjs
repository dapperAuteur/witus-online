#!/usr/bin/env node
// Propagate the canonical WitUS shared rules into every ecosystem repo's CLAUDE.md.
//
// The canonical block lives in docs/shared-rules.md between the markers
//   <!-- BEGIN:witus-shared-rules vN -->  ...  <!-- END:witus-shared-rules vN -->
// This script copies that block verbatim into each target repo's CLAUDE.md, replacing any
// existing managed block (matched by marker), and leaving all hand-owned content untouched.
//
// It NEVER commits — per the branch-hygiene rule each repo is branched + committed separately.
// Dry-run by default; pass --write to apply.
//
//   node scripts/sync-claude-rules.mjs            # report what would change
//   node scripts/sync-claude-rules.mjs --write    # apply
//   node scripts/sync-claude-rules.mjs --write --only /abs/path/to/repo   # one repo
//
// Run from the witus repo root.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const BEGIN_RE = /<!--\s*BEGIN:witus-shared-rules\s+(v\d+)\s*-->/;
const END_RE = /<!--\s*END:witus-shared-rules\s+v\d+\s*-->/;
// Match the whole managed block (markers inclusive) for replacement.
const BLOCK_RE =
  /<!--\s*BEGIN:witus-shared-rules\s+v\d+\s*-->[\s\S]*?<!--\s*END:witus-shared-rules\s+v\d+\s*-->/;

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

function extractCanonicalBlock() {
  const src = readFileSync(join(ROOT, "docs/shared-rules.md"), "utf8");
  const begin = src.match(BEGIN_RE);
  const block = src.match(BLOCK_RE);
  if (!begin || !block) {
    console.error("FATAL: could not find the BEGIN/END managed block in docs/shared-rules.md");
    process.exit(1);
  }
  return { version: begin[1], block: block[0] };
}

function stubClaudeMd(repoPath) {
  const name = basename(repoPath);
  return `## ⚠️ Ecosystem repo identity (don't confuse these)

This repo — **${name}** — is a WitUS ecosystem app. Replace this line with the product name + URL
(see \`gemini/witus/lib/products.ts\`). The shared ecosystem rules are synced in below; edit them in
\`gemini/witus/docs/shared-rules.md\`, not here.

`;
}

function syncRepo(repoPath, canonical) {
  const claudePath = join(repoPath, "CLAUDE.md");
  const existed = existsSync(claudePath);
  let content = existed ? readFileSync(claudePath, "utf8") : stubClaudeMd(repoPath);

  const current = content.match(BLOCK_RE);
  const currentVer = current ? (current[0].match(BEGIN_RE) || [])[1] : null;

  let next;
  let action;
  if (current) {
    if (current[0] === canonical.block) return { action: "up-to-date", repoPath, currentVer };
    next = content.replace(BLOCK_RE, canonical.block);
    action = existed ? `updated (${currentVer} → ${canonical.version})` : "created";
  } else {
    // No managed block yet: append after existing content.
    const sep = content.endsWith("\n") ? "\n" : "\n\n";
    next = content + sep + "---\n\n" + canonical.block + "\n";
    action = existed ? "added-block" : "created";
  }

  if (WRITE) writeFileSync(claudePath, next, "utf8");
  return { action, repoPath, currentVer };
}

function main() {
  const manifest = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));
  const canonical = extractCanonicalBlock();
  let targets = manifest.targets;
  if (ONLY) targets = targets.filter((t) => t === ONLY || basename(t) === ONLY);

  console.log(
    `${WRITE ? "APPLYING" : "DRY-RUN"} witus-shared-rules ${canonical.version} → ${targets.length} repos\n`
  );

  const missing = [];
  const changed = [];
  for (const repoPath of targets) {
    if (!existsSync(repoPath)) {
      missing.push(repoPath);
      console.log(`  ??  MISSING REPO   ${repoPath}`);
      continue;
    }
    const r = syncRepo(repoPath, canonical);
    if (r.action !== "up-to-date") changed.push(r);
    const tag = r.action === "up-to-date" ? "ok " : "->>";
    console.log(`  ${tag} ${r.action.padEnd(22)} ${basename(repoPath)}`);
  }

  console.log(
    `\n${changed.length} repo(s) ${WRITE ? "changed" : "would change"}, ${
      targets.length - changed.length - missing.length
    } up-to-date, ${missing.length} missing.`
  );
  if (!WRITE && changed.length) console.log("Re-run with --write to apply.");
  if (WRITE && changed.length) {
    console.log(
      "\nNOTE: nothing was committed. Branch + commit each repo separately (branch-hygiene rule):"
    );
    console.log("  cd <repo> && git checkout -b chore/sync-witus-shared-rules && git add CLAUDE.md && git commit");
  }
}

main();
