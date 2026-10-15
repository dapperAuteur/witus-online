// neon-key-plan — print, never run, the checklist that gives every Neon project its own project-scoped
// key and wires it into the matching GitHub repo and into this app's NEON_PROJECT_KEYS.
//
//   NEON_PERSONAL_KEY=<personal key> npx tsx scripts/neon-key-plan.ts
//
// Project-scoped keys are created in the Neon Console only (Organization settings → API keys →
// Create new → Project-scoped; Neon support, 2026-10-15, correcting an earlier CLI suggestion), and
// each key is shown once. A project-scoped key has Editor access to its whole project: it can still
// change or delete any branch there, so the `preview/` name filter in lib/cost-cleanup is the real
// guard, and the key must never reach client-side code. The personal key here is used for one GET to
// list projects and never stored. Repo names are guessed from project names; edit them where the
// guess is wrong. Nothing here is written anywhere.
import { existsSync, readFileSync } from "node:fs";

const key = process.env.NEON_PERSONAL_KEY;
if (!key) {
  console.error("Set NEON_PERSONAL_KEY (Neon Console → Account settings → API keys). It is used for one GET and never stored.");
  process.exit(1);
}
const manifestPath = "docs/ecosystem-repos.json";
const repoNames = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { targets: string[] }).targets.map((p) => p.split("/").pop() as string)
  : [];

async function main() {
  const res = await fetch("https://console.neon.tech/api/v2/projects?limit=400", { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET /projects → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { projects } = (await res.json()) as { projects: { id: string; name: string; org_id?: string }[] };
  console.log(`# ${projects.length} Neon project(s). For each: create its own key, set it on its repo, and add it to the hub's map.\n`);
  const guess = (name: string) => {
    const n = name.toLowerCase();
    return repoNames.find((r) => n.includes(r.toLowerCase())) ?? repoNames.find((r) => r.toLowerCase().includes(n)) ?? "<repo>";
  };
  for (const p of projects) {
    const repo = guess(p.name);
    console.log(`## ${p.name}  (project ${p.id})  → repo dapperAuteur/${repo}`);
    console.log(`Console: Organization settings → API keys → Create new → Project-scoped → project "${p.name}" → name preview-bot-${repo} → copy once`);
    console.log(`gh variable set NEON_PROJECT_ID --repo dapperAuteur/${repo} --body "${p.id}"`);
    console.log(`gh secret set NEON_API_KEY --repo dapperAuteur/${repo} --body "<the key you just copied>"\n`);
  }
  console.log(`# Hub map for witus-online's NEON_PROJECT_KEYS (Vercel env, server-side only):`);
  console.log(JSON.stringify(Object.fromEntries(projects.map((p) => [p.id, `<key for ${p.name}>`])), null, 0));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
