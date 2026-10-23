// neon-key-plan — give every Neon project its own project-scoped API key and wire it into the matching
// GitHub repo and into this app's NEON_PROJECT_KEYS.
//
// Uses the Neon CLI (`npm i -g neon`) signed in as you; no API key to paste. From the witus repo:
//
//   neon orgs list                              # if this fails: neon login
//   npx tsx scripts/neon-key-plan.ts            # dry run: maps projects to repos, changes nothing
//   npx tsx scripts/neon-key-plan.ts --store    # a new key per mapped project, stored straight into
//                                               # GitHub and the witus-online Vercel env; never printed
//
// --store needs `gh` signed in (`brew install gh && gh auth login`) and this repo linked to the
// witus-online Vercel project (`vercel link`); both are checked before any key is made. Each run makes a
// fresh key per project, stores it, then revokes every older key with the same name, so a re-run is safe
// and no key that was ever shown stays live. A key travels on stdin, never in argv where `ps` can read
// it. The old --create printed every key to the terminal and is gone (BAM, 2026-10-22: "each key goes
// straight into GitHub without being shown").
//
// Why the CLI (2026-10-16): Neon creates project-scoped keys only for a person, not for an
// organization key ("This endpoint requires a personal API key"), a project-scoped key cannot list
// projects, and BAM's Neon account (Vercel-managed organization) offers only organization and project
// keys. The CLI's own sign-in acts as the person, so `neon api-keys create --project-id` works.
//
// Repo mapping, two signals:
//   1. Endpoint (preferred): each ecosystem repo's local `.env*` files are read for Neon hostnames only
//      (never credentials); Neon says which project owns each `ep-...` endpoint.
//   2. Name (fallback): most projects are named after their repo. A name that fits several repos is not
//      used alone.
// A project neither signal places gets no key and is listed at the end (check Vercel → Storage).
// When two projects map to one repo, both get keys for NEON_PROJECT_KEYS, but only the first gets the
// repo's gh lines: the cleanup workflow takes one project per repo.
//
// Project-scoped keys (Neon docs, manage/api-keys, read 2026-10-15): Editor access to the whole project;
// they cannot delete the project or manage access, but they CAN change or delete any branch, so the
// `preview/` name filter in lib/cost-cleanup and the GitHub workflow is the real guard and the key must
// never reach client-side code. Revocation is immediate (`neon api-keys revoke <id>`).

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const STORE = process.argv.includes("--store");
if (process.argv.includes("--create")) {
  console.error("--create printed keys to the terminal and is gone. Use --store: each key goes straight into GitHub and Vercel.");
  process.exit(1);
}

/**
 * Mappings settled by evidence, checked 2026-10-16 with `neon branches list`:
 * - contractor-os-db: its preview branches carry contractor-os branch names (preview/bundle/contractor-os-...);
 *   centenarian-os's env only points at it (the CentOS / Work.WitUS split), so the endpoint signal misleads.
 */
const PROJECT_REPO_OVERRIDES: Record<string, string> = { "contractor-os-db": "contractor-os" };
/**
 * Repos with more than one Neon project: the cleanup workflow takes one, so name it. witus-online uses
 * witus-db (9 preview branches) and witus-identity-db (2); the second is cleaned from /admin/cost-cleanup.
 */
const PRIMARY_PROJECT: Record<string, string> = {
  "witus-online": "witus-db",
  // BAM, 2026-10-16: reset neon-ride-wit-us to the app schema and move RideWitUS onto it, so the
  // database name matches the repo; neon-aureolin-school (schema only, no rows) is then deleted.
  "ride-wit-us": "neon-ride-wit-us",
};
/** Projects that get no key, with the reason. */
const SKIP_PROJECTS: Record<string, string> = {
  "neon-aureolin-school": "being deleted; RideWitUS moves to neon-ride-wit-us (BAM, 2026-10-16)",
};

/** Run the Neon CLI and parse its JSON output. Exits with the CLI's message on failure. */
function neon<T>(args: string[]): T {
  const r = spawnSync("neon", [...args, "-o", "json"], { encoding: "utf8" });
  if (r.error) {
    console.error("The Neon CLI is not on PATH. Install it with `npm i -g neon`, then `neon login`.");
    process.exit(1);
  }
  if (r.status !== 0) throw new Error(`neon ${args.join(" ")} failed: ${(r.stderr || r.stdout).trim().slice(0, 300)}`);
  return JSON.parse(r.stdout) as T;
}

/** endpoint id (ep-...) → repo names whose local env files point at it. Hostnames only. */
function localEndpointMap(targets: string[]): Map<string, Set<string>> {
  const roots = ["/Users/bam/Code_NOiCloud/ai-builds", "/Users/bam/Code_NOiCloud", process.cwd()];
  const repoDirs = new Set<string>([process.cwd()]);
  for (const t of targets) {
    const dir = [t, ...roots.map((r) => join(r, t))].map((p) => resolve(p)).find((p) => existsSync(p));
    if (dir) repoDirs.add(dir);
  }
  const map = new Map<string, Set<string>>();
  const re = /(ep-[a-z0-9]+(?:-[a-z0-9]+)*?)(?:-pooler)?\.[a-z0-9.-]*neon\.tech/g;
  for (const dir of repoDirs) {
    const repo = dir === process.cwd() ? "witus-online" : basename(dir);
    for (const f of readdirSync(dir)) {
      if (!f.startsWith(".env") || /\.(example|sample)$/.test(f)) continue;
      for (const m of readFileSync(join(dir, f), "utf8").matchAll(re)) {
        if (!map.has(m[1])) map.set(m[1], new Set());
        map.get(m[1])!.add(repo);
      }
    }
  }
  return map;
}

/** Repos whose name fits the project's name. Several candidates = ambiguous. */
function nameCandidates(projectName: string, repoNames: string[]): string[] {
  const n = projectName.toLowerCase().replace(/-db$/, "");
  const exact = repoNames.filter((r) => r.toLowerCase() === n);
  if (exact.length) return exact;
  return repoNames.filter((r) => n.includes(r.toLowerCase()) || r.toLowerCase().includes(n));
}

/** Run a CLI, with `input` (a key) on stdin. Throws with the CLI's own message, which never holds the key. */
function run(cmd: string, args: string[], input?: string): string {
  const r = spawnSync(cmd, args, { encoding: "utf8", input });
  if (r.error) throw new Error(`${cmd} is not on PATH`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} failed: ${(r.stderr || r.stdout).trim().slice(0, 300)}`);
  return r.stdout;
}

/** Before any key is made: gh signed in, Vercel signed in, and this checkout linked to witus-online. */
function preflightStore(): void {
  const fail = (why: string): never => {
    console.error(`${why}\nNothing was created.`);
    process.exit(1);
  };
  try {
    run("gh", ["auth", "status"]);
  } catch {
    fail("gh is not installed or not signed in. Run: brew install gh && gh auth login");
  }
  try {
    run("vercel", ["whoami"]);
  } catch {
    fail("The Vercel CLI is not signed in. Run: vercel login");
  }
  const linked = existsSync(".vercel/project.json")
    ? (JSON.parse(readFileSync(".vercel/project.json", "utf8")) as { projectName?: string }).projectName
    : undefined;
  if (linked !== "witus-online") fail(`This checkout is linked to ${linked ?? "no Vercel project"}, not witus-online. Run: vercel link`);
}

type Project = { id: string; name: string };
const asList = <T>(d: unknown, key: string): T[] => (Array.isArray(d) ? d : ((d as Record<string, T[]>)[key] ?? [])) as T[];

function main() {
  const manifest = JSON.parse(readFileSync("docs/ecosystem-repos.json", "utf8")) as { targets: string[] };
  const repoNames = ["witus-online", ...manifest.targets.map((t) => basename(t))];
  const endpoints = localEndpointMap(manifest.targets);

  if (STORE) preflightStore();
  const orgs = asList<{ id: string; name: string }>(neon(["orgs", "list"]), "organizations");
  const projects: (Project & { org: string; orgId: string })[] = [];
  for (const o of orgs) {
    for (const p of asList<Project>(neon(["projects", "list", "--org-id", o.id]), "projects")) {
      projects.push({ ...p, org: o.name, orgId: o.id });
    }
  }
  // Neon refuses a key name that already exists in the organization ("choose another unique name"), so
  // each run stamps its names (preview-bot-<project>-YYYYMMDDHHMM) and retires the project's older keys:
  // the plain preview-bot-<project> that --create made, and any earlier stamped one.
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
  const orgKeys = new Map<string, { id: number; name: string }[]>();
  if (STORE) {
    for (const o of orgs) orgKeys.set(o.id, asList(neon(["api-keys", "list", "--org-id", o.id]), "api_keys"));
  }
  const olderKeys = (orgId: string, base: string, keepId?: number) =>
    (orgKeys.get(orgId) ?? []).filter(
      (k) => k.id !== keepId && (k.name === base || (k.name.startsWith(`${base}-`) && /^\d{12}$/.test(k.name.slice(base.length + 1)))),
    );
  const primaries = new Set(Object.values(PRIMARY_PROJECT));
  projects.sort((a, b) => Number(primaries.has(b.name)) - Number(primaries.has(a.name)));
  console.log(`# ${projects.length} Neon project(s) in ${orgs.length} organization(s); ${endpoints.size} endpoint(s) found in local env files.`);
  console.log(STORE ? "# Making one key per mapped project and storing it; no key is printed.\n" : "# Dry run: add --store to make the keys and store them.\n");

  const keysMap: Record<string, string> = {};
  const repoTaken = new Map<string, string>();
  const unmatched: string[] = [];
  let failures = 0;
  let mapped = 0;
  /** Revoke a project's older keys. Called only once the new key is where it belongs. */
  const retire = (p: { orgId: string }, base: string, keepId?: number) => {
    const stale = olderKeys(p.orgId, base, keepId);
    for (const k of stale) {
      try {
        neon(["api-keys", "revoke", String(k.id), "--org-id", p.orgId]);
      } catch (e) {
        failures++;
        console.log(`   FAILED to revoke older key "${k.name}" (${k.id}): ${e instanceof Error ? e.message : e}`);
      }
    }
    if (stale.length) console.log(`   revoked ${stale.length} older key(s): ${stale.map((k) => k.name).join(", ")}`);
  };
  for (const p of projects) {
    if (SKIP_PROJECTS[p.name]) {
      unmatched.push(`${p.name} (project ${p.id}): ${SKIP_PROJECTS[p.name]}`);
      continue;
    }
    const eps = asList<{ id: string }>(neon(["api", `/projects/${p.id}/endpoints`]), "endpoints");
    const byEndpoint = [...new Set(eps.flatMap((e) => [...(endpoints.get(e.id) ?? [])]))];
    const byName = nameCandidates(p.name, repoNames);
    let repo: string;
    let how: string;
    if (PROJECT_REPO_OVERRIDES[p.name]) {
      repo = PROJECT_REPO_OVERRIDES[p.name];
      how = "override in this script (see PROJECT_REPO_OVERRIDES)";
    } else if (byEndpoint.length > 1) {
      console.log(`## ${p.name}  (project ${p.id})  → SEVERAL repos' env files point here: ${byEndpoint.join(", ")}. Skipped; decide by hand.\n`);
      continue;
    } else if (byEndpoint.length === 1) {
      repo = byEndpoint[0];
      how = byName.length === 1 && byName[0] !== repo ? `endpoint; the name suggested ${byName[0]}` : "endpoint";
    } else if (byName.length === 1) {
      repo = byName[0];
      how = "name";
    } else {
      unmatched.push(`${p.name} (project ${p.id})${byName.length > 1 ? `: name fits ${byName.join(", ")}` : ""}`);
      continue;
    }
    const second = repoTaken.get(repo);
    const cleanupNote = second ? " Clean its preview branches from /admin/cost-cleanup." : "";
    console.log(`## ${p.name}  (project ${p.id})  → repo dapperAuteur/${repo}  [matched by ${how}]`);
    const base = `preview-bot-${p.name}`;
    const keyName = `${base}-${stamp}`;
    let secret = "";
    let madeId: number | undefined;
    mapped++;
    if (STORE) {
      try {
        const made = neon<{ key?: string; id?: number }>(["api-keys", "create", "--name", keyName, "--project-id", p.id]);
        if (!made.key) throw new Error("the CLI returned no key field");
        secret = made.key;
        madeId = made.id;
        keysMap[p.id] = secret;
        console.log(`   created key "${keyName}" (id ${made.id ?? "?"})`);
      } catch (e) {
        failures++;
        console.log(`   FAILED to create key: ${e instanceof Error ? e.message : e}\n`);
        continue;
      }
    } else {
      keysMap[p.id] = "<key>";
    }
    if (second) {
      console.log(`   note: ${repo} already uses ${second} for its cleanup workflow (one project per repo). This key goes only into NEON_PROJECT_KEYS.${cleanupNote}\n`);
      if (STORE) retire(p, base, madeId);
      continue;
    }
    repoTaken.set(repo, p.name);
    if (!STORE) {
      console.log(`   would set NEON_PROJECT_ID=${p.id} and the secret NEON_API_KEY on dapperAuteur/${repo}\n`);
      continue;
    }
    try {
      run("gh", ["variable", "set", "NEON_PROJECT_ID", "--repo", `dapperAuteur/${repo}`, "--body", p.id]);
      run("gh", ["secret", "set", "NEON_API_KEY", "--repo", `dapperAuteur/${repo}`], secret);
      console.log(`   stored NEON_PROJECT_ID and NEON_API_KEY on dapperAuteur/${repo}`);
      retire(p, base, madeId);
      console.log("");
    } catch (e) {
      // The older key may be the one GitHub still holds, so it stays live until a run stores a new one.
      failures++;
      console.log(`   FAILED to store on GitHub (older keys left alone): ${e instanceof Error ? e.message : e}\n`);
    }
  }

  if (unmatched.length) {
    console.log(`# ${unmatched.length} project(s) get no key (skipped, or not placed by endpoint or name). Check Vercel → Storage for any you do not recognize:`);
    for (const u of unmatched) console.log(`#   ${u}`);
    console.log("");
  }
  const count = Object.keys(keysMap).length;
  if (!STORE) {
    console.log(`# --store would also set NEON_PROJECT_KEYS (${count} project(s)) on the witus-online Vercel project, Production.`);
    return;
  }
  if (count < mapped) {
    // A partial map would drop projects the hub can clean today, so the Vercel value is left as it is.
    failures++;
    console.log(`# NEON_PROJECT_KEYS left unchanged on Vercel: only ${count} of ${mapped} keys were made.`);
  } else try {
    // Replace, not append: Vercel refuses to add a name that already exists. Absent is fine.
    spawnSync("vercel", ["env", "rm", "NEON_PROJECT_KEYS", "production", "--yes"], { encoding: "utf8" });
    run("vercel", ["env", "add", "NEON_PROJECT_KEYS", "production", "--sensitive"], JSON.stringify(keysMap));
    console.log(`# Stored NEON_PROJECT_KEYS (${count} project(s)) on witus-online, Production. Redeploy witus-online to load it.`);
  } catch (e) {
    failures++;
    console.log(`# FAILED to store NEON_PROJECT_KEYS on Vercel: ${e instanceof Error ? e.message : e}`);
  }
  if (failures) {
    console.log(`# ${failures} step(s) failed (above). Rerun --store: it makes fresh keys and revokes these.`);
    process.exit(1);
  }
  console.log("# Done. No key was printed.");
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
