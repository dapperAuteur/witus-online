// neon-key-plan — give every Neon project its own project-scoped API key and wire it into the matching
// GitHub repo and into this app's NEON_PROJECT_KEYS.
//
// Run from the witus repo. The key must be a PERSONAL API key (Neon Console → your avatar →
// Account settings → API keys), not an organization key and not a project-scoped key:
//
//   read -s NEON_PERSONAL_KEY      # paste the key, press Enter; nothing shows
//   export NEON_PERSONAL_KEY
//   npx tsx scripts/neon-key-plan.ts            # dry run: maps projects to repos, changes nothing
//   npx tsx scripts/neon-key-plan.ts --create   # mints one key per MATCHED project, prints each once
//   unset NEON_PERSONAL_KEY
//
// (Never type `NEON_PERSONAL_KEY=<personal key>` literally: zsh reads `<` as a file redirect.)
//
// Which key does what (seen 2026-10-16): an organization key can list projects (the dry run works) but
// Neon refuses it for creating keys ("This endpoint requires a personal API key"); a project-scoped key
// cannot even list projects ("not allowed to perform actions outside the project this key is scoped to").
//
// Repo mapping, two signals:
//   1. Endpoint (preferred): each ecosystem repo's local `.env*` files are read for Neon hostnames only
//      (never credentials); Neon says which project owns each `ep-...` endpoint.
//   2. Name (fallback): most projects are named after their repo. A name that fits more than one repo
//      (e.g. "wanderlearn" vs wanderlearn-app and wanderlearn-stories) is not used on its own.
// When both signals exist and disagree, the endpoint wins and the line says so. A project neither signal
// places gets no key: it is listed at the end (often a Vercel-named store like `neon-aureolin-school`;
// check Vercel → Storage to see which project it is attached to).
//
// Project-scoped keys (Neon docs, manage/api-keys, read 2026-10-15): Editor access to the whole project;
// they cannot delete the project or manage access, but they CAN change or delete any branch, so the
// `preview/` name filter in lib/cost-cleanup and the GitHub workflow is the real guard and the key must
// never reach client-side code. Revocation is immediate.
//
// --create prints each new key exactly once, next to the gh commands that store it, and ends with the
// assembled NEON_PROJECT_KEYS JSON for the witus-online Vercel env. The personal key is never stored.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const key = process.env.NEON_PERSONAL_KEY;
const CREATE = process.argv.includes("--create");
if (!key) {
  console.error("Set NEON_PERSONAL_KEY to a PERSONAL key (Neon Console → avatar → Account settings → API keys). See the header.");
  process.exit(1);
}
const API = "https://console.neon.tech/api/v2";
const H = { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" };

/** endpoint id (ep-...) → repo names whose local env files point at it. Hostnames only. */
function localEndpointMap(): Map<string, Set<string>> {
  const manifest = JSON.parse(readFileSync("docs/ecosystem-repos.json", "utf8")) as { targets: string[] };
  const roots = ["/Users/bam/Code_NOiCloud/ai-builds", "/Users/bam/Code_NOiCloud", process.cwd()];
  const repoDirs = new Set<string>([process.cwd()]);
  for (const t of manifest.targets) {
    const dir = [t, ...roots.map((r) => join(r, t))].map((p) => resolve(p)).find((p) => existsSync(p));
    if (dir) repoDirs.add(dir);
  }
  const map = new Map<string, Set<string>>();
  const re = /(ep-[a-z0-9]+(?:-[a-z0-9]+)*?)(?:-pooler)?\.[a-z0-9.-]*neon\.tech/g;
  for (const dir of repoDirs) {
    const repo = dir === process.cwd() ? "witus-online" : basename(dir);
    for (const f of readdirSync(dir)) {
      if (!f.startsWith(".env") || /\.(example|sample)$/.test(f)) continue;
      const text = readFileSync(join(dir, f), "utf8");
      for (const m of text.matchAll(re)) {
        if (!map.has(m[1])) map.set(m[1], new Set());
        map.get(m[1])!.add(repo);
      }
    }
  }
  return map;
}

/** Repos whose name fits the project's name. Several candidates = ambiguous. */
function nameCandidates(projectName: string, repoNames: string[]): string[] {
  const n = projectName.toLowerCase();
  const exact = repoNames.filter((r) => r.toLowerCase() === n);
  if (exact.length) return exact;
  return repoNames.filter((r) => n.includes(r.toLowerCase()) || r.toLowerCase().includes(n));
}

async function neon<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: H, ...init });
  const body = await res.text();
  if (!res.ok) {
    if (body.includes("outside the project this key is scoped to")) {
      throw new Error("This is a project-scoped key. Use a PERSONAL key: Neon Console → avatar → Account settings → API keys.");
    }
    throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return JSON.parse(body) as T;
}

async function main() {
  const endpoints = localEndpointMap();
  const manifest = JSON.parse(readFileSync("docs/ecosystem-repos.json", "utf8")) as { targets: string[] };
  const repoNames = ["witus-online", ...manifest.targets.map((t) => basename(t))];
  const { projects } = await neon<{ projects: { id: string; name: string; org_id?: string }[] }>("/projects?limit=400");
  console.log(`# ${projects.length} Neon project(s); ${endpoints.size} endpoint(s) found in local env files.`);
  console.log(CREATE ? "# Creating one key per matched project now; each key prints ONCE.\n" : "# Dry run: add --create to mint the keys.\n");

  const map: Record<string, string> = {};
  const unmatched: string[] = [];
  for (const p of projects) {
    const { endpoints: eps } = await neon<{ endpoints: { id: string }[] }>(`/projects/${p.id}/endpoints`);
    const byEndpoint = [...new Set(eps.flatMap((e) => [...(endpoints.get(e.id) ?? [])]))];
    const byName = nameCandidates(p.name, repoNames);
    let repo: string;
    let how: string;
    if (byEndpoint.length > 1) {
      console.log(`## ${p.name}  (project ${p.id})  → SEVERAL repos' env files point here: ${byEndpoint.join(", ")}. Skipped; decide by hand.\n`);
      continue;
    } else if (byEndpoint.length === 1) {
      repo = byEndpoint[0];
      how = byName.length === 1 && byName[0] !== repo ? `matched by endpoint; the name suggested ${byName[0]}` : "matched by endpoint";
    } else if (byName.length === 1) {
      repo = byName[0];
      how = "matched by name";
    } else {
      unmatched.push(`${p.name} (project ${p.id})${byName.length > 1 ? `: name fits ${byName.join(", ")}` : ""}`);
      continue;
    }
    const name = `preview-bot-${repo}`;
    console.log(`## ${p.name}  (project ${p.id})  → repo dapperAuteur/${repo}  [${how}]`);
    let secret = "<the key>";
    if (CREATE) {
      if (!p.org_id) {
        console.log(`   skipped: no org_id (personal-account project); create its key in the Console → Account settings → API keys\n`);
        continue;
      }
      try {
        const made = await neon<{ key: string; id: number }>(`/organizations/${p.org_id}/api_keys`, {
          method: "POST",
          body: JSON.stringify({ key_name: name, project_id: p.id }),
        });
        secret = made.key;
        map[p.id] = secret;
        console.log(`   created key "${name}" (id ${made.id})`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("requires a personal API key")) {
          console.error("\nSTOP: this is an organization key. Neon only lets a PERSONAL key create project-scoped keys.");
          console.error("Make one at Neon Console → avatar → Account settings → API keys, then run again. Nothing was created.");
          process.exit(1);
        }
        console.log(`   FAILED to create key: ${msg}\n`);
        continue;
      }
    } else {
      console.log(`   Console: Organization settings → API keys → Create new → Project-scoped → "${p.name}" → name ${name}`);
    }
    console.log(`gh variable set NEON_PROJECT_ID --repo dapperAuteur/${repo} --body "${p.id}"`);
    console.log(`gh secret set NEON_API_KEY --repo dapperAuteur/${repo} --body "${secret}"\n`);
  }

  if (unmatched.length) {
    console.log(`# ${unmatched.length} project(s) not placed by endpoint or name, so no key was made. Check Vercel → Storage for each:`);
    for (const u of unmatched) console.log(`#   ${u}`);
    console.log("");
  }
  console.log(`# NEON_PROJECT_KEYS for the witus-online Vercel project (server env only):`);
  console.log(JSON.stringify(CREATE ? map : Object.fromEntries(Object.keys(map).map((id) => [id, "<key>"]))));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
