import { branchId, deploymentId, inventory, parseNeonProjectKeys } from "@/lib/cost-cleanup";
import { getEnv } from "@/lib/env";
import { CleanupSelector, type Group } from "./CleanupSelector";

export const dynamic = "force-dynamic";

// Owner page: what the preview pipeline has left behind in every tool that bills for it, listed per
// app with a checkbox per item, select-all per project, select-all across the ecosystem. Why it
// exists: the Vercel-managed Neon integration deletes a preview branch only when its Vercel deployment
// is deleted (six-month retention by default), and two months of stale branches cost over $100 each
// (2026-10). Rule: docs/shared-rules.md "Preview-branch cleanup". Same library as
// scripts/preview-cleanup.ts.
export default async function CostCleanupPage() {
  const env = getEnv();
  const creds = { vercelToken: env.VERCEL_TOKEN, neonProjectKeys: parseNeonProjectKeys(env.NEON_PROJECT_KEYS) };
  const inv = await inventory(creds);

  const groups: Group[] = [];
  const byVercelProject = new Map<string, Group>();
  for (const d of [...inv.vercel.deployments].sort((a, b) => a.projectName.localeCompare(b.projectName) || b.created - a.created)) {
    let g = byVercelProject.get(d.projectName);
    if (!g) {
      g = { key: `vercel:${d.projectId}`, tool: "vercel", project: d.projectName, rows: [] };
      byVercelProject.set(d.projectName, g);
      groups.push(g);
    }
    g.rows.push({
      id: deploymentId(d),
      label: d.url,
      detail: `${d.gitBranch ?? "no git branch"}${d.state ? ` · ${d.state.toLowerCase()}` : ""}`,
      created: new Date(d.created).toISOString().slice(0, 10),
    });
  }
  const byNeonProject = new Map<string, Group>();
  for (const b of [...inv.neon.branches].sort((a, b) => a.projectName.localeCompare(b.projectName) || a.createdAt.localeCompare(b.createdAt))) {
    let g = byNeonProject.get(b.projectId);
    if (!g) {
      g = { key: `neon:${b.projectId}`, tool: "neon", project: b.projectName, rows: [] };
      byNeonProject.set(b.projectId, g);
      groups.push(g);
    }
    g.rows.push({ id: branchId(b), label: b.name, detail: `branch ${b.id}`, created: b.createdAt.slice(0, 10) });
  }
  const total = inv.vercel.deployments.length + inv.neon.branches.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Cost cleanup: preview leftovers</h1>
        <p className="text-sm text-slate-400">
          Everything a preview deployment can leave running on a bill, per app. Tick rows, a whole project, or everything,
          then delete. Vercel preview deployments and Neon <code>preview/*</code> branches today; Supabase has no persistent
          branches by rule and MongoDB Atlas creates nothing per preview.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-slate-200"><dt className="text-slate-400">Vercel</dt><dd>{inv.vercel.configured ? `${inv.vercel.deployments.length} preview deployment(s) · teams ${inv.vercel.teams.map((t) => t.slug).join(", ") || "none"}` : "not configured: set VERCEL_TOKEN"}</dd></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-slate-200"><dt className="text-slate-400">Neon</dt><dd>{inv.neon.configured ? `${inv.neon.branches.length} deletable preview branch(es) · ${inv.neon.skipped.length} skipped (default, protected or parent)` : "not configured: set NEON_PROJECT_KEYS, one project-scoped key per project (Neon Console → Organization settings → API keys → Create new → Project-scoped)"}</dd></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-slate-200"><dt className="text-slate-400">Supabase</dt><dd>no branches by rule (nothing to list)</dd></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-slate-200"><dt className="text-slate-400">MongoDB Atlas</dt><dd>nothing per preview; cost is the cluster tier</dd></div>
      </dl>

      {inv.errors.length ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {inv.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      {total === 0 ? <p className="text-sm text-slate-400">Nothing to delete.</p> : <CleanupSelector groups={groups} />}

      <p className="text-xs text-slate-500">
        Same code as <code>npx tsx scripts/preview-cleanup.ts [--delete]</code>. The per-PR workflow in every Neon repo
        deletes a branch when its pull request closes; this page is for what that misses.
      </p>
    </div>
  );
}
