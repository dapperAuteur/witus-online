import { loadBranchesOverview, type UnmergedBranch } from "@/lib/ops/branches";
import { STALE_DAYS } from "@/lib/ops/branch-flags.mjs";
import { RefreshButton } from "../refresh-button";

export const dynamic = "force-dynamic";

const badge = "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs font-semibold";

function Flags({ b }: { b: UnmergedBranch }) {
  return (
    <>
      {b.security ? <span className={`${badge} border-red-700 bg-red-950/70 text-red-200`}>Security</span> : null}
      {b.bundle ? <span className={`${badge} border-teal-800 bg-teal-950/60 text-teal-200`}>Bundle</span> : null}
      {b.stale ? <span className={`${badge} border-slate-700 bg-slate-900 text-slate-300`}>Stale</span> : null}
    </>
  );
}

export default async function BranchesPage() {
  const overview = await loadBranchesOverview();
  if (!overview.tokenSet) {
    return (
      <p className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
        Branches are not being read: <span className="font-mono">GITHUB_ROADMAP_TOKEN</span> is not set (task 132).
      </p>
    );
  }
  const withBranches = overview.repos.filter((r) => r.unmerged.length > 0 || r.error);
  const clean = overview.repos.filter((r) => r.unmerged.length === 0 && !r.error);
  const all = overview.repos.flatMap((r) => r.unmerged);
  const security = all.filter((b) => b.security).length;
  const bundles = all.filter((b) => b.bundle).length;

  return (
    <div className="space-y-6">
      <section aria-labelledby="branches-heading" className="space-y-3">
        <h2 id="branches-heading" className="text-xl font-semibold tracking-tight text-slate-100">
          Unmerged branches
        </h2>
        <p className="text-sm text-slate-300">
          {all.length} branch{all.length === 1 ? "" : "es"} ahead of main in {withBranches.length} repo
          {withBranches.length === 1 ? "" : "s"}
          {security ? `, ${security} security` : ""}
          {bundles ? `, ${bundles} bundle${bundles === 1 ? "" : "s"}` : ""}. Stale means no commit in {STALE_DAYS} days.
          Merging stays on GitHub; each row links to its compare page.
        </p>
        <RefreshButton />
      </section>

      {withBranches.map((r) => {
        const headingId = `repo-${r.app.slug}`;
        return (
          <section key={r.repo} aria-labelledby={headingId} className="space-y-2">
            <h3 id={headingId} className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-slate-100">
              {r.app.name}
              <span className="text-sm font-normal text-slate-400">
                {r.repo.split("/")[1]} · {r.unmerged.length} unmerged of {r.total}
              </span>
            </h3>
            {r.error ? <p className="break-words text-sm text-amber-200">{r.error}</p> : null}
            <ul className="space-y-2">
              {r.unmerged.map((b) => (
                <li key={b.name} className="rounded-lg border border-slate-800 px-3 py-3 text-sm">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Flags b={b} />
                    <span className="min-w-0 break-all font-mono text-slate-100">{b.name}</span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    {b.ahead} ahead, {b.behind} behind
                    {b.ageDays !== null ? ` · last commit ${b.ageDays === 0 ? "today" : `${b.ageDays} d ago`}` : ""}
                  </p>
                  {b.subject ? <p className="mt-1 break-words text-slate-400">{b.subject}</p> : null}
                  <a
                    href={`https://github.com/${r.repo}/compare/main...${b.name.split("/").map(encodeURIComponent).join("/")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-3 text-sm font-semibold text-teal-300 hover:border-teal-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                  >
                    Compare on GitHub<span className="sr-only"> for {b.name} (opens in new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {clean.length > 0 ? (
        <details className="rounded-lg border border-slate-800">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-slate-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
            {clean.length} repos with nothing unmerged
          </summary>
          <ul className="space-y-1 px-3 pb-3 text-sm text-slate-400">
            {clean.map((r) => (
              <li key={r.repo}>
                {r.app.name} <span className="text-slate-500">({r.total} branches, all merged)</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
