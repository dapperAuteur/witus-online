// neon-key-plan — print, never run, the commands that give every Neon project its own project-scoped
// key and wire it into the matching GitHub repo and into this app's NEON_PROJECT_KEYS.
//
//   NEON_PERSONAL_KEY=<personal key> npx tsx scripts/neon-key-plan.ts
//
// Why a plan and not an action: creating keys needs a personal (account-wide) key and org-admin
// rights, and the created key is shown once. BAM runs the printed lines, pastes each key where the
// line says, and the personal key never leaves his shell. Repo names are guessed from project
// names; edit them where the guess is wrong. Nothing here is written anywhere.
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
    console.log(`npx neonctl api-keys create --name preview-bot-${repo} --project-id ${p.id}${p.org_id ? `   # org ${p.org_id}` : ""}`);
    console.log(`gh variable set NEON_PROJECT_ID --repo dapperAuteur/${repo} --body "${p.id}"`);
    console.log(`gh secret set NEON_API_KEY --repo dapperAuteur/${repo} --body "<the key printed above>"\n`);
  }
  console.log(`# Hub map for witus-online's NEON_PROJECT_KEYS (Vercel env, server-side only):`);
  console.log(JSON.stringify(Object.fromEntries(projects.map((p) => [p.id, `<key for ${p.name}>`])), null, 0));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
