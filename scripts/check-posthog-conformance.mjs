#!/usr/bin/env node
/**
 * Audit every ecosystem repo's PostHog setup against the standard in plans/26.
 *
 *   node scripts/check-posthog-conformance.mjs          # all repos in the manifest
 *   node scripts/check-posthog-conformance.mjs <path>   # one repo
 *
 * Exits 1 if any repo has drifted, so it can gate a release or run in CI.
 *
 * WHY THIS EXISTS INSTEAD OF A SHARED PACKAGE
 *
 * The obvious way to keep ~20 repos on one analytics posture is to publish
 * @witus/analytics and have everyone depend on it. That was considered and rejected:
 * the genuinely shared surface is ~130 lines, consumers span Next 15→16, React 18→19,
 * and both npm and pnpm, and a private package would mean an NPM_TOKEN on every Vercel
 * project — a new install-time failure mode on 20 builds that currently have none.
 *
 * A package also would not deliver the thing people actually want from it. Each repo
 * pins its own semver, so publishing a change does not update anybody; you still bump
 * and redeploy all 20. What you actually want is to KNOW WHICH REPOS HAVE DRIFTED,
 * which is what this does — with no registry, no tokens, and no peer-dependency
 * negotiation. Same shape as scripts/check-oidc-env.mjs, which caught four real
 * problems on its first run.
 *
 * Revisit the package decision if the shared config changes twice, or if a third
 * shared module appears. At that point the surface is big enough to flip the maths.
 *
 * These are TEXTUAL checks, not an AST parse. That is a deliberate trade: the settings
 * being audited are literal booleans and strings in an init call, a regex reads them
 * reliably, and the failure mode is a false ALARM (someone formatted the file oddly)
 * rather than a false PASS. A checker that silently passes is worse than none.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/** Directories never worth walking. */
const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", ".vercel", "coverage", ".turbo",
]);

/** Recursively collect files matching a predicate, bounded so a stray symlink can't hang. */
function walk(dir, predicate, out = [], depth = 0) {
  if (depth > 8 || !existsSync(dir)) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // unreadable dir — not this script's problem
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, predicate, out, depth + 1);
    } else if (entry.isFile() && predicate(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The standard. Each rule states the literal that must be present and the reason, so a
 * failure explains itself without anyone having to open plans/26.
 */
const RULES = [
  {
    key: "autocapture",
    want: /autocapture:\s*false/,
    forbid: /autocapture:\s*true/,
    why: "records every click and keystroke — sign-in and support forms — and is the main event-volume cost driver",
  },
  {
    key: "session recording",
    want: /disable_session_recording:\s*true/,
    forbid: /disable_session_recording:\s*false/,
    why: "replay requires consent essentially always; school districts have hard rules on recording students",
  },
  {
    key: "persistence",
    want: /persistence:\s*["']memory["']/,
    forbid: /persistence:\s*["'](localStorage|cookie|localStorage\+cookie|sessionStorage)["']/,
    why: "device storage is what triggers a consent banner; memory is what lets the ecosystem ship without one",
  },
  {
    key: "capture_pageview",
    want: /capture_pageview:\s*false/,
    forbid: /capture_pageview:\s*true/,
    why: "the automatic pageview cannot see App Router client navigations — it fires once then under-reports",
  },
  {
    key: "app property",
    want: /register\(\s*\{\s*app:/,
    forbid: null,
    why: "without register({ app }) this app's events land unlabelled in the shared project and can't be attributed",
  },
];

function auditRepo(repoPath) {
  const name = repoPath.split("/").slice(-1)[0];
  const result = { name, repoPath, status: "ok", errors: [], warnings: [], notes: [] };

  if (!existsSync(repoPath)) {
    result.status = "missing";
    result.notes.push("repo not found on disk");
    return result;
  }

  // Find wherever init actually happens, rather than assuming a path. Layouts differ:
  // witus uses lib/analytics/, wanderlearn src/lib/analytics/, tour-manager-os splits
  // across lib/analytics/ and components/analytics/.
  const sources = walk(repoPath, (f) => /\.(t|j)sx?$/.test(f)).filter((f) => {
    try {
      return readFileSync(f, "utf8").includes("posthog.init(");
    } catch {
      return false;
    }
  });

  if (sources.length === 0) {
    result.status = "not-instrumented";
    return result;
  }

  const initFile = sources[0];
  const src = readFileSync(initFile, "utf8");
  result.initFile = relative(repoPath, initFile);

  for (const rule of RULES) {
    if (rule.forbid?.test(src)) {
      result.errors.push(`${rule.key}: set to the WRONG value — ${rule.why}`);
    } else if (!rule.want.test(src)) {
      result.errors.push(`${rule.key}: not set — ${rule.why}`);
    }
  }

  // Proxy detection has to look repo-wide, not just at the init file. In the reference
  // implementation `api_host: apiHost` is a prop, and the "/ingest" literal lives in the
  // layout that mounts the provider — checking only the init file reports the correct
  // pattern as unproxied, which is how this check failed its own first run.
  const usesIngest = walk(repoPath, (f) => /\.(t|j)sx?$/.test(f)).some((f) => {
    try {
      const s = readFileSync(f, "utf8");
      return /api_host:\s*["']\/ingest["']/.test(s) || /apiHost[=:]\s*["']\/ingest["']/.test(s);
    } catch {
      return false;
    }
  });
  const hasRewrite = walk(repoPath, (f) => /^next\.config\.(t|m|c)?[jt]s$/.test(f)).some((f) =>
    /i\.posthog\.com/.test(readFileSync(f, "utf8")),
  );

  if (usesIngest && !hasRewrite) {
    // The dangerous half-configured state: the browser posts to a path that doesn't
    // proxy anywhere, so every event 404s while the code looks correct.
    result.errors.push(
      'api_host is "/ingest" but no next.config rewrite points it at PostHog — every event 404s',
    );
  } else if (!usesIngest) {
    // Warning, not error: events still arrive, just not from blocked browsers.
    result.warnings.push(
      "not proxied — api_host targets PostHog directly, so uBlock/Brave/Safari will drop a share of events",
    );
  }

  // The EU default bug: a US key against the EU host fails silently, no error, no events.
  const euRefs = walk(repoPath, (f) => /\.(t|j)sx?$|\.env/.test(f)).filter((f) => {
    try {
      return /eu\.i\.posthog\.com/.test(readFileSync(f, "utf8"));
    } catch {
      return false;
    }
  });
  for (const f of euRefs) {
    result.errors.push(
      `references eu.i.posthog.com in ${relative(repoPath, f)} — the shared project is US; ` +
        "a US key against the EU host fails SILENTLY (no error, no events)",
    );
  }

  if (result.errors.length) result.status = "drift";
  else if (result.warnings.length) result.status = "warn";
  return result;
}

// ── Run ──────────────────────────────────────────────────────────────────────
const arg = process.argv[2];
let repos;
if (arg) {
  repos = [arg];
} else {
  const manifest = JSON.parse(readFileSync(join(ROOT, "docs/ecosystem-repos.json"), "utf8"));
  // Same manifest the shared-rules propagation uses, so the two never disagree about
  // what "the ecosystem" is. The source repo is audited too — it is the reference
  // implementation, so it has to pass its own check.
  repos = [manifest.source, ...manifest.targets];
}

const results = repos.map(auditRepo);
const rule = "─".repeat(72);

console.log(`\nPostHog conformance — ${results.length} repo(s)`);
console.log(rule);

const drift = results.filter((r) => r.status === "drift");
const warn = results.filter((r) => r.status === "warn");
const ok = results.filter((r) => r.status === "ok");
const none = results.filter((r) => r.status === "not-instrumented");
const missing = results.filter((r) => r.status === "missing");

for (const r of [...drift, ...warn]) {
  const icon = r.status === "drift" ? "✖" : "⚠";
  console.log(`\n${icon} ${r.name}  (${r.initFile})`);
  for (const e of r.errors) console.log(`    ✖ ${e}`);
  for (const w of r.warnings) console.log(`    ⚠ ${w}`);
}

if (ok.length) console.log(`\n✔ conformant: ${ok.map((r) => r.name).join(", ")}`);
if (none.length) {
  console.log(`\n· not instrumented yet (${none.length}): ${none.map((r) => r.name).join(", ")}`);
  console.log("  Expected mid-rollout — see plans/user-tasks/52.");
}
if (missing.length) console.log(`\n? not on disk: ${missing.map((r) => r.name).join(", ")}`);

console.log(`\n${rule}`);
if (drift.length) {
  console.log(`✖ ${drift.length} repo(s) drifted, ${warn.length} warning(s).\n`);
  process.exit(1);
}
console.log(`✔ No drift. ${warn.length} warning(s), ${none.length} not yet instrumented.\n`);
