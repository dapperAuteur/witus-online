// vercel-build-settings — show, and with --apply change, the two project settings that make every
// Vercel build billable: the build machine type and On-Demand Concurrent Builds.
//
//   npx tsx scripts/vercel-build-settings.ts            # dry run: current settings per project
//   npx tsx scripts/vercel-build-settings.ts --apply    # set Standard machine + on-demand concurrency OFF, all projects
//   npx tsx scripts/vercel-build-settings.ts --apply --only witus-learn,centenarian-os
//
// Why (Vercel docs, read 2026-10-15): "Builds on Standard build machines are only billed when
// on-demand concurrency is enabled or Elastic build machines are selected" (docs/pricing#builds);
// Pro teams get Elastic machines and on-demand concurrency by default, and "Elastic build machines are
// also billed by CPU minute, starting at $0.0035 per CPU minute" (docs/builds/managing-builds). On
// 2026-10-15 the 30-day usage report put Build CPU Minutes at about $42 of a $73 bill, with seven
// projects on Enhanced (8 vCPU) machines and 26 on on-demand concurrency. Standard + on-demand off
// means up to 3 concurrent builds, queued beyond that, which is fine for one person.
// Token: VERCEL_TOKEN, else the Vercel CLI auth file. Team: --scope <slug> (default bam-apps).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx !== -1 ? new Set(process.argv[onlyIdx + 1].split(",")) : null;
const scopeIdx = process.argv.indexOf("--scope");
const SCOPE = scopeIdx !== -1 ? process.argv[scopeIdx + 1] : "bam-apps";

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
  const r = await fetch(`https://api.vercel.com${path}`, { ...init, headers: { ...H, ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`${init?.method ?? "GET"} ${path.replace(/teamId=[^&]+/, "teamId=…")} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T;
}

interface Project { id: string; name: string; resourceConfig?: { buildMachineType?: string; elasticConcurrencyEnabled?: boolean; buildQueue?: { configuration?: string } } }

async function main() {
  const teams = (await api<{ teams: { id: string; slug: string }[] }>("/v2/teams")).teams;
  const team = teams.find((t) => t.slug === SCOPE);
  if (!team) throw new Error(`No team with slug ${SCOPE}; have: ${teams.map((t) => t.slug).join(", ")}`);
  const projects: Project[] = [];
  let until: number | undefined;
  do {
    const d = await api<{ projects: Project[]; pagination?: { next?: number } }>(`/v9/projects?teamId=${team.id}&limit=100${until ? `&until=${until}` : ""}`);
    projects.push(...d.projects);
    until = d.pagination?.next ?? undefined;
  } while (until);
  console.log(`${APPLY ? "APPLYING" : "Dry run"}: ${projects.length} project(s) in ${SCOPE}\n`);
  let changed = 0;
  for (const p of projects.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = await api<Project>(`/v9/projects/${p.id}?teamId=${team.id}`);
    const rc = full.resourceConfig ?? {};
    const machine = rc.buildMachineType ?? "(default: elastic)";
    const onDemand = rc.elasticConcurrencyEnabled;
    const billable = machine !== "standard" || onDemand !== false;
    const line = `${p.name.padEnd(44)} machine=${machine.padEnd(22)} onDemandConcurrency=${String(onDemand ?? "(default: on)").padEnd(14)} ${billable ? "BILLED per CPU minute" : "included"}`;
    if (!APPLY || !billable || (ONLY && !ONLY.has(p.name))) {
      console.log(line);
      continue;
    }
    await api(`/v9/projects/${p.id}?teamId=${team.id}`, {
      method: "PATCH",
      body: JSON.stringify({ resourceConfig: { buildMachineType: "standard", elasticConcurrencyEnabled: false } }),
    });
    changed++;
    console.log(`${line}\n${"".padEnd(44)} → set machine=standard onDemandConcurrency=false`);
  }
  console.log(`\n${APPLY ? `Changed ${changed} project(s).` : "Re-run with --apply to set Standard + on-demand concurrency off on every billed project (or --only a,b)."}`);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
