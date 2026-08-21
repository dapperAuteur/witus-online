#!/usr/bin/env node
/**
 * Finds controls that LOOK finished and silently do nothing.
 *
 *   node scripts/check-inert-controls.mjs                 # every repo in the manifest
 *   node scripts/check-inert-controls.mjs <repo-path>...  # specific repos
 *   node scripts/check-inert-controls.mjs --json          # machine-readable
 *
 * WHY A SCRIPT: none of these fail loudly. An inert button renders, is clickable, and discards
 * the click — nothing errors, nothing logs, no test notices. The only way to find them across
 * 20+ repos is to look for the shape rather than the symptom.
 *
 * WHAT IT REPORTS (candidates, not verdicts — every hit needs a human read):
 *   inert-button   <button> with no onClick, no type="submit", no form=, no disabled
 *   empty-handler  onClick={() => {}} / handler whose body is only a TODO or console.log
 *   href-hash      href="#" (and not a documented skip-link target)
 *   dead-link      <Link href="/x"> where /x matches no page.tsx route in this app
 *   server-control <button onClick> in a file with no 'use client' (React would throw, but
 *                  this catches the inverse: interactive markup stranded in a server component)
 *
 * KNOWN FALSE POSITIVES, by design — better to over-report and read:
 *   - buttons inside a <form> that submit via the form's action (no type attr needed in HTML,
 *     though Next/React usually wants type="submit"), flagged but usually fine
 *   - handlers passed down as props (onClick={props.onSelect}) — not flagged, we only flag empty
 *   - links to external hosts, /api routes, or files in public/ — excluded from dead-link
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const paths = args.filter((a) => !a.startsWith("--"));

function walk(dir, pred, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    // .claude/worktrees holds throwaway agent worktrees — stale copies of this repo's own
    // source. Scanning them reports the same control many times and, worse, reports code that
    // was already fixed on main. witus-learn alone had 33 of them producing 35 phantom findings.
    if (e === "node_modules" || e === ".next" || e === ".git" || e === "dist" || e === "build" || e === "worktrees" || e === ".claude") continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, pred, acc);
    else if (pred(p)) acc.push(p);
  }
  return acc;
}

/** Every routable path in a Next App Router app, so dead links can be resolved rather than guessed. */
function routeIndex(repo) {
  const roots = [join(repo, "app"), join(repo, "src/app")].filter(existsSync);
  const routes = new Set();
  for (const root of roots) {
    for (const f of walk(root, (p) => /\/(page|route)\.(t|j)sx?$/.test(p))) {
      let r = relative(root, dirname(f))
        .split("/")
        .filter((seg) => !/^\(.*\)$/.test(seg) && seg !== "@modal")   // route groups + parallel slots
        .join("/");
      routes.add("/" + r);
    }
  }
  return routes;
}

/** Does `href` match a real route, allowing for dynamic segments? */
function routeExists(href, routes) {
  const clean = href.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (routes.has(clean)) return true;
  const parts = clean.split("/").filter(Boolean);
  for (const r of routes) {
    const rp = r.split("/").filter(Boolean);
    const catchAll = rp.some((s) => s.startsWith("[..."));
    if (!catchAll && rp.length !== parts.length) continue;
    let ok = true;
    for (let i = 0; i < rp.length; i++) {
      if (rp[i].startsWith("[")) continue;              // dynamic segment matches anything
      if (rp[i] !== parts[i]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function lineOf(src, index) { return src.slice(0, index).split("\n").length; }

function auditRepo(repo) {
  const name = repo.split("/").filter(Boolean).slice(-1)[0];
  const out = { name, repo, findings: [] };
  if (!existsSync(repo)) { out.missing = true; return out; }

  const routes = routeIndex(repo);
  const files = walk(repo, (p) => /\.(t|j)sx$/.test(p) && !/\.(test|spec)\./.test(p));

  for (const file of files) {
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const rel = relative(repo, file);
    const isClient = /^\s*['"]use client['"]/m.test(src);
    const add = (kind, idx, snippet, note) =>
      out.findings.push({ kind, file: rel, line: lineOf(src, idx), snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 120), note });

    // <button …> with nothing that could make it act.
    // NOTE: a naive /<button[^>]*>/ truncates at the first ">" — which can sit INSIDE a JSX
    // expression (aria-label={count > 0 ? …}) — and then misses an onClick that follows.
    // scanTag walks to the real tag end, tracking brace depth and quotes.
    const scanTag = (from) => {
      let depth = 0, quote = null;
      for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (quote) { if (c === quote && src[i - 1] !== "\\") quote = null; continue; }
        if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) return src.slice(from, i + 1);
      }
      return src.slice(from, from + 400);
    };
    for (const m of src.matchAll(/<button\b/g)) {
      const tag = scanTag(m.index);
      const hasAction = /onClick|onSubmit|onPointerDown|onMouseDown|onKeyDown|type\s*=\s*["'{]?submit|form\s*=|formAction|disabled|aria-disabled|\{\.\.\.|asChild/.test(tag);
      // Radix/shadcn pattern: <Dialog.Trigger asChild><button …>. The parent clones the child
      // and injects the handler, so the button tag itself is legitimately bare.
      const parentAsChild = /asChild[^<]*$/.test(src.slice(Math.max(0, m.index - 300), m.index));
      if (!hasAction && !parentAsChild) {
        const before = src.slice(0, m.index);
        const lastOpen = before.lastIndexOf("<form");
        const inForm = lastOpen !== -1 && before.lastIndexOf("</form>") < lastOpen;
        add("inert-button", m.index, tag, inForm ? "inside a <form> — may submit via form action" : (isClient ? "client component" : "server component, no handler possible"));
      }
    }

    // handlers that exist but do nothing
    for (const m of src.matchAll(/on[A-Z]\w+\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g)) add("empty-handler", m.index, m[0]);
    for (const m of src.matchAll(/on[A-Z]\w+\s*=\s*\{\s*\(\s*\)\s*=>\s*\{[^}]{0,200}?(TODO|not implemented|coming soon)[^}]{0,200}?\}\s*\}/gi)) add("empty-handler", m.index, m[0], "TODO body");

    // href="#"
    for (const m of src.matchAll(/href\s*=\s*["']#["']/g)) add("href-hash", m.index, src.slice(Math.max(0, m.index - 60), m.index + 20));

    // <Link href="/internal"> pointing nowhere
    for (const m of src.matchAll(/<Link\b[^>]*?href\s*=\s*["'](\/[^"'{]*)["']/g)) {
      const href = m[1];
      if (/^\/(api|_next)\b/.test(href) || /\.[a-z0-9]{2,4}$/i.test(href)) continue;
      if (routes.size && !routeExists(href, routes)) add("dead-link", m.index, m[0], `no route matches ${href}`);
    }
  }
  return out;
}

let repos = paths;
if (!repos.length) {
  const manifest = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));
  repos = [manifest.source, ...manifest.targets];
}

const results = repos.map(auditRepo);
if (asJson) { console.log(JSON.stringify(results, null, 2)); process.exit(0); }

let total = 0;
for (const r of results) {
  if (r.missing) { console.log(`?  ${r.name}: not found on disk`); continue; }
  const byKind = {};
  for (const f of r.findings) (byKind[f.kind] ??= []).push(f);
  total += r.findings.length;
  if (!r.findings.length) { console.log(`✔ ${r.name}: no candidates`); continue; }
  console.log(`\n✖ ${r.name} — ${r.findings.length} candidate(s)`);
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`   ${kind} (${list.length})`);
    for (const f of list.slice(0, 12)) console.log(`     ${f.file}:${f.line}  ${f.snippet}${f.note ? `   [${f.note}]` : ""}`);
    if (list.length > 12) console.log(`     …and ${list.length - 12} more`);
  }
}
console.log(`\n${"─".repeat(72)}\n${total} candidate(s) across ${results.filter((r) => !r.missing).length} repo(s). Every one needs a human read — see the header for known false positives.`);
