// neon-key-plan — give every Neon project its own project-scoped API key and wire it into the matching
// GitHub repo and into this app's NEON_PROJECT_KEYS.
//
// Uses the Neon CLI (`npm i -g neon`) signed in as you; no API key to paste. From the witus repo:
//
//   neon orgs list                              # if this fails: neon login
//   npx tsx scripts/neon-key-plan.ts            # dry run: maps projects to repos, changes nothing
//   npx tsx scripts/neon-key-plan.ts --create   # one key per mapped project, each printed ONCE
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

const CREATE = process.argv.includes("--create");

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
const PRIMARY_PROJECT: Record<string, string> = { "witus-online": "witus-db" };

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

type Project = { id: string; name: string };
const asList = <T>(d: unknown, key: string): T[] => (Array.isArray(d) ? d : ((d as Record<string, T[]>)[key] ?? [])) as T[];

function main() {
  const manifest = JSON.parse(readFileSync("docs/ecosystem-repos.json", "utf8")) as { targets: string[] };
  const repoNames = ["witus-online", ...manifest.targets.map((t) => basename(t))];
  const endpoints = localEndpointMap(manifest.targets);

  const orgs = asList<{ id: string; name: string }>(neon(["orgs", "list"]), "organizations");
  const projects: (Project & { org: string })[] = [];
  for (const o of orgs) {
    for (const p of asList<Project>(neon(["projects", "list", "--org-id", o.id]), "projects")) projects.push({ ...p, org: o.name });
  }
  const primaries = new Set(Object.values(PRIMARY_PROJECT));
  projects.sort((a, b) => Number(primaries.has(b.name)) - Number(primaries.has(a.name)));
  console.log(`# ${projects.length} Neon project(s) in ${orgs.length} organization(s); ${endpoints.size} endpoint(s) found in local env files.`);
  console.log(CREATE ? "# Creating one key per mapped project now; each key prints ONCE.\n" : "# Dry run: add --create to make the keys.\n");

  const keysMap: Record<string, string> = {};
  const repoTaken = new Map<string, string>();
  const unmatched: string[] = [];
  for (const p of projects) {
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
    let secret = "<the key>";
    if (CREATE) {
      try {
        const made = neon<{ key?: string; id?: number }>(["api-keys", "create", "--name", `preview-bot-${p.name}`, "--project-id", p.id]);
        if (!made.key) throw new Error("the CLI returned no key field");
        secret = made.key;
        keysMap[p.id] = secret;
        console.log(`   created key "preview-bot-${p.name}" (id ${made.id ?? "?"})`);
      } catch (e) {
        console.log(`   FAILED to create key: ${e instanceof Error ? e.message : e}\n`);
        continue;
      }
    } else {
      keysMap[p.id] = "<key>";
    }
    if (second) {
      console.log(`   note: ${repo} already uses ${second} for its cleanup workflow (one project per repo). This key goes only into NEON_PROJECT_KEYS.${cleanupNote}\n`);
      continue;
    }
    repoTaken.set(repo, p.name);
    console.log(`gh variable set NEON_PROJECT_ID --repo dapperAuteur/${repo} --body "${p.id}"`);
    console.log(`gh secret set NEON_API_KEY --repo dapperAuteur/${repo} --body "${secret}"\n`);
  }

  if (unmatched.length) {
    console.log(`# ${unmatched.length} project(s) not placed by endpoint or name, so no key was made. Check Vercel → Storage for each:`);
    for (const u of unmatched) console.log(`#   ${u}`);
    console.log("");
  }
  console.log(`# NEON_PROJECT_KEYS for the witus-online Vercel project (server env only):`);
  console.log(JSON.stringify(keysMap));
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
