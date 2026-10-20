// vercel-retention — copy one project's Deployment Retention Policy to every project in the team.
//
//   npx tsx scripts/vercel-retention.ts                       # dry run: each project's policy vs the source
//   npx tsx scripts/vercel-retention.ts --apply               # set it on every project that differs
//   npx tsx scripts/vercel-retention.ts --from witus-learn --apply --save plans/user-tasks/<file>.tsv
//
// Source (default witus-learn): the policy BAM set by hand on 2026-10-20, previews, canceled and errored
// builds kept 1 day, production 30 days, deploymentsToKeep 10. Why it is the cheaper choice (Vercel docs,
// deployment-retention, read 2026-10-20): "Retained deployment output contributes to Deployment Storage",
// which Pro teams are now billed for; Pro defaults are 180 days for previews and 1 year for production.
// Rollback safety is unchanged: Vercel always keeps the last 10 deployments, the last 20 Ready production
// and the last 20 Ready non-production deployments, anything holding a production or custom alias, and
// the latest preview of every still-active Git branch.
//
// Shortening retention lets Vercel delete expired deployments (typically within 48 hours) and, through
// the Neon integration, their `preview/*` database branches. Deleted deployments can be restored during
// Vercel's recovery period. --save writes each project's previous policy before any change.
// Token: VERCEL_TOKEN, else the Vercel CLI auth file. Team: --scope <slug> (default bam-apps).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const APPLY = process.argv.includes("--apply");
const FROM = arg("--from") ?? "witus-learn";
const SCOPE = arg("--scope") ?? "bam-apps";
const SAVE = arg("--save");

function token(): string {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const p = join(homedir(), "Library/Application Support/com.vercel.cli/auth.json");
  if (existsSync(p)) {
    const t = (JSON.parse(readFileSync(p, "utf8")) as { token?: string }).token;
    if (t) return t;
  }
  throw new Error("Set VERCEL_TOKEN or log in with the Vercel CLI.");
}
const H = { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://api.vercel.com${path}`, { headers: H, ...init });
  if (!r.ok) throw new Error(`${init?.method ?? "GET"} ${path} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T;
}

type Policy = Record<string, number> | null;
async function main() {
  const { teams } = await api<{ teams: { id: string; slug: string }[] }>("/v2/teams");
  const team = teams.find((t) => t.slug === SCOPE);
  if (!team) throw new Error(`team ${SCOPE} not found`);
  const q = `teamId=${team.id}`;
  const src = (await api<{ deploymentExpiration?: Policy }>(`/v9/projects/${FROM}?${q}`)).deploymentExpiration ?? null;
  if (!src) throw new Error(`${FROM} has no custom retention policy to copy`);
  console.log(`${APPLY ? "Applying" : "Dry run:"} policy from ${FROM}: ${JSON.stringify(src)}\n`);
  const { projects } = await api<{ projects: { id: string; name: string }[] }>(`/v10/projects?${q}&limit=100`);
  const rows = ["project\tprevious_deploymentExpiration"];
  let changed = 0;
  for (const p of projects.sort((a, b) => a.name.localeCompare(b.name))) {
    const cur = (await api<{ deploymentExpiration?: Policy }>(`/v9/projects/${p.id}?${q}`)).deploymentExpiration ?? null;
    rows.push(`${p.name}\t${JSON.stringify(cur)}`);
    if (JSON.stringify(cur) === JSON.stringify(src)) {
      console.log(`${p.name.padEnd(44)} matches`);
      continue;
    }
    if (!APPLY) {
      console.log(`${p.name.padEnd(44)} now ${JSON.stringify(cur)}`);
      continue;
    }
    const after = (await api<{ deploymentExpiration?: Policy }>(`/v9/projects/${p.id}?${q}`, { method: "PATCH", body: JSON.stringify({ deploymentExpiration: src }) })).deploymentExpiration;
    const ok = JSON.stringify(after) === JSON.stringify(src);
    if (ok) changed++;
    console.log(`${p.name.padEnd(44)} ${ok ? "set" : "NOT set, check by hand"}`);
  }
  if (SAVE) writeFileSync(SAVE, rows.join("\n") + "\n");
  console.log(APPLY ? `\nChanged ${changed} project(s).` : "\nRe-run with --apply (add --save <file.tsv> to keep the previous policies).");
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
