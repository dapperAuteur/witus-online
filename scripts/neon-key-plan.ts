// neon-key-plan — give every Neon project its own project-scoped API key and wire it into the matching
// GitHub repo and into this app's NEON_PROJECT_KEYS.
//
//   NEON_PERSONAL_KEY=<personal key> npx tsx scripts/neon-key-plan.ts            # print the checklist
//   NEON_PERSONAL_KEY=<personal key> npx tsx scripts/neon-key-plan.ts --create   # mint the keys, print once
//
// Project-scoped keys (Neon docs, manage/api-keys, read 2026-10-15): created by an organization admin
// in the Console (Organization settings → API keys → Create new → Project-scoped), with the CLI
// (`neon api-keys create --name <name> --project-id <id>`), or with the API
// (`POST /organizations/{org_id}/api_keys` {key_name, project_id}) using a personal key. A key has
// Editor access to its whole project: it cannot delete the project or manage access, but it CAN change
// or delete any branch there, so the `preview/` name filter in lib/cost-cleanup is the real guard and the
// key must never reach client-side code. Revocation is immediate (401 afterwards).
//
// --create prints each new key exactly once, next to the gh commands that store it, and ends with the
// assembled NEON_PROJECT_KEYS JSON for the witus-online Vercel env. The personal key is used for the
// list and the creates and is never stored. Repo names are guessed from project names; edit the gh
// lines where the guess is wrong.
import { existsSync, readFileSync } from "node:fs";

const key = process.env.NEON_PERSONAL_KEY;
const CREATE = process.argv.includes("--create");
if (!key) {
  console.error("Set NEON_PERSONAL_KEY (Neon Console → Account settings → API keys).");
  process.exit(1);
}
const H = { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" };
const manifestPath = "docs/ecosystem-repos.json";
const repoNames = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { targets: string[] }).targets.map((p) => p.split("/").pop() as string)
  : [];
const guess = (name: string) => {
  const n = name.toLowerCase();
  return repoNames.find((r) => n.includes(r.toLowerCase())) ?? repoNames.find((r) => r.toLowerCase().includes(n)) ?? "<repo>";
};

async function main() {
  const res = await fetch("https://console.neon.tech/api/v2/projects?limit=400", { headers: H });
  if (!res.ok) throw new Error(`GET /projects → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { projects } = (await res.json()) as { projects: { id: string; name: string; org_id?: string }[] };
  console.log(`# ${projects.length} Neon project(s). One project-scoped key each.${CREATE ? " Creating them now; each key prints ONCE." : " Dry run: add --create to mint them."}\n`);
  const map: Record<string, string> = {};
  for (const p of projects) {
    const repo = guess(p.name);
    const name = `preview-bot-${repo === "<repo>" ? p.name : repo}`;
    console.log(`## ${p.name}  (project ${p.id})  → repo dapperAuteur/${repo}`);
    let secret = "<the key>";
    if (CREATE) {
      if (!p.org_id) {
        console.log(`   skipped: project has no org_id (personal-account project); create its key in the Console → Account settings → API keys`);
        continue;
      }
      const r = await fetch(`https://console.neon.tech/api/v2/organizations/${p.org_id}/api_keys`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({ key_name: name, project_id: p.id }),
      });
      if (!r.ok) {
        console.log(`   FAILED to create key: ${r.status} ${(await r.text()).slice(0, 160)}`);
        continue;
      }
      const made = (await r.json()) as { key: string; id: number };
      secret = made.key;
      map[p.id] = secret;
      console.log(`   created key "${name}" (id ${made.id})`);
    } else {
      console.log(`Console: Organization settings → API keys → Create new → Project-scoped → "${p.name}" → name ${name}`);
      console.log(`   or: npx neonctl api-keys create --name ${name} --project-id ${p.id}`);
    }
    console.log(`gh variable set NEON_PROJECT_ID --repo dapperAuteur/${repo} --body "${p.id}"`);
    console.log(`gh secret set NEON_API_KEY --repo dapperAuteur/${repo} --body "${secret}"\n`);
  }
  console.log(`# NEON_PROJECT_KEYS for the witus-online Vercel project (server env only):`);
  console.log(JSON.stringify(CREATE ? map : Object.fromEntries(projects.map((p) => [p.id, `<key for ${p.name}>`]))));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
