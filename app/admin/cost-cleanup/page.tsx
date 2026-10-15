import { inventory } from "@/lib/cost-cleanup";
import { getEnv } from "@/lib/env";
import { CleanupForm } from "./CleanupForm";

export const dynamic = "force-dynamic";

// Owner page: what the preview pipeline has left behind in every tool that bills for it, and one
// button to remove it. Why it exists: the Vercel-managed Neon integration deletes a preview branch
// only when its Vercel deployment is deleted (six-month retention by default), and two months of
// stale branches cost over $100 each (2026-10). Rule: docs/shared-rules.md "Preview-branch cleanup".
export default async function CostCleanupPage() {
  const env = getEnv();
  const creds = { vercelToken: env.VERCEL_TOKEN, neonApiKey: env.NEON_API_KEY };
  const inv = await inventory(creds);
  const byProject = new Map<string, number>();
  for (const d of inv.vercel.deployments) byProject.set(d.projectName, (byProject.get(d.projectName) ?? 0) + 1);
  const total = inv.vercel.deployments.length + inv.neon.branches.length;
  const nothingConfigured = !inv.vercel.configured && !inv.neon.configured;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Cost cleanup: preview leftovers</h1>
        <p className="text-sm text-neutral-600">
          Everything a preview deployment can leave running on a bill. Vercel preview deployments and Neon{" "}
          <code>preview/*</code> branches today; Supabase has no persistent branches by rule and MongoDB Atlas
          creates nothing per preview.
        </p>
      </header>

      {inv.errors.length ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {inv.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-medium">Vercel preview deployments</h2>
        {!inv.vercel.configured ? (
          <p className="text-sm text-neutral-600">
            Not configured: set <code>VERCEL_TOKEN</code> (a Vercel account token with access to the team).
          </p>
        ) : byProject.size === 0 ? (
          <p className="text-sm text-neutral-600">None. Teams checked: {inv.vercel.teams.map((t) => t.slug).join(", ") || "none"}.</p>
        ) : (
          <table className="mt-2 text-sm">
            <thead>
              <tr>
                <th className="pr-6 text-left">Project</th>
                <th className="text-right">Preview deployments</th>
              </tr>
            </thead>
            <tbody>
              {[...byProject].sort((a, b) => b[1] - a[1]).map(([name, n]) => (
                <tr key={name}>
                  <td className="pr-6">{name}</td>
                  <td className="text-right">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">Neon preview branches</h2>
        {!inv.neon.configured ? (
          <p className="text-sm text-neutral-600">
            Not configured: set <code>NEON_API_KEY</code> (Neon Console → Account settings → API keys).
          </p>
        ) : inv.neon.branches.length === 0 ? (
          <p className="text-sm text-neutral-600">
            None deletable. {inv.neon.skipped.length} preview-named branch(es) skipped as default, protected or parent.
          </p>
        ) : (
          <table className="mt-2 text-sm">
            <thead>
              <tr>
                <th className="pr-6 text-left">Project</th>
                <th className="pr-6 text-left">Branch</th>
                <th className="text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {inv.neon.branches.map((b) => (
                <tr key={b.id}>
                  <td className="pr-6">{b.projectName}</td>
                  <td className="pr-6 font-mono">{b.name}</td>
                  <td>{b.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <CleanupForm disabled={nothingConfigured} count={total} />

      <p className="text-xs text-neutral-500">
        Same code as <code>npx tsx scripts/preview-cleanup.ts [--delete]</code>. The per-PR workflow in every Neon
        repo deletes a branch when its pull request closes; this page is for what that misses.
      </p>
    </div>
  );
}
