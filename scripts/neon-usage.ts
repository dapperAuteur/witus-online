// neon-usage — what each Neon project used this billing period and what it costs on the Launch plan.
//
//   npx tsx scripts/neon-usage.ts               # every project, most expensive first
//   npx tsx scripts/neon-usage.ts witus-learn   # projects whose name contains "witus-learn"
//
// Uses the signed-in Neon CLI; prints no secrets. Rates are Neon's published Launch prices (docs,
// introduction/plans, read 2026-10-20): compute $0.106 per CU-hour; storage $0.35 per GB-month; branches
// beyond 10 per project $1.50 per branch-month; public transfer 500 GB per project included, then $0.10/GB.
// The estimate covers compute, transfer above the allowance, and branches above 10 for the period so far;
// storage is shown but not priced (it is billed hourly on actual size). Neon's console (Billing) and the
// Neon line on the Vercel invoice are the authoritative numbers; this script explains what drives them.
//
// What drives the bill: compute is "database awake" time multiplied by its size. A database wakes on any
// query and sleeps 5 minutes after the last one, so steady traffic (crawlers, uptime checks, crons) keeps
// it awake around the clock. `active_h` is awake hours; `compute` is awake hours times the size in CU.
// Why this exists: Learn.WitUS went down on 2026-10-16 after 7.71 GB of transfer on the Free plan, and the
// organization moved to Launch on 2026-10-20 (witus tasks 111, 114).

import { allProjects, asList, neon } from "./neon-cli";

const RATE = { cuHour: 0.106, transferGB: 0.1, includedTransferGB: 500, extraBranchMonth: 1.5, includedBranches: 10 };
const filter = process.argv[2];

type P = {
  name: string; compute_time_seconds?: number; active_time_seconds?: number; data_transfer_bytes?: number;
  synthetic_storage_size?: number; consumption_period_start?: string; owner?: { subscription_type?: string };
};

const rows = allProjects()
  .filter((p) => !filter || p.name.includes(filter))
  .map((p) => {
    const d = neon<{ project: P }>(["api", `/projects/${p.id}`]).project;
    const branches = asList<unknown>(neon(["api", `/projects/${p.id}/branches`]), "branches").length;
    const cu = (d.compute_time_seconds ?? 0) / 3600;
    const gb = (d.data_transfer_bytes ?? 0) / 1e9;
    const periodStart = d.consumption_period_start ? new Date(d.consumption_period_start) : new Date();
    const daysIn = Math.max((Date.now() - periodStart.getTime()) / 864e5, 1 / 24);
    const extraBranchCost = Math.max(branches - RATE.includedBranches, 0) * RATE.extraBranchMonth * (daysIn / 30);
    const cost = cu * RATE.cuHour + Math.max(gb - RATE.includedTransferGB, 0) * RATE.transferGB + extraBranchCost;
    return { name: p.name, plan: d.owner?.subscription_type ?? "?", since: periodStart.toISOString().slice(0, 10), active: (d.active_time_seconds ?? 0) / 3600, cu, gb, mb: (d.synthetic_storage_size ?? 0) / 1e6, branches, cost };
  })
  .sort((a, b) => b.cost - a.cost);

console.log("project                             plan        since       awake_h  compute_CUh  transfer_GB  storage_MB  branches  est_Launch_$");
for (const r of rows) {
  console.log(`${r.name.padEnd(35)} ${r.plan.padEnd(11)} ${r.since}  ${r.active.toFixed(1).padStart(7)}  ${r.cu.toFixed(1).padStart(11)}  ${r.gb.toFixed(2).padStart(11)}  ${r.mb.toFixed(0).padStart(10)}  ${String(r.branches).padStart(8)}  ${r.cost.toFixed(2).padStart(12)}`);
}
const total = rows.reduce((s, r) => s + r.cost, 0);
console.log(`\nEstimated Launch cost this period so far: $${total.toFixed(2)} (compute, extra transfer, branches over 10).`);
