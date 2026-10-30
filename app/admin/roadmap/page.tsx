import Link from "next/link";
import { loadRoadmapOverview, type AppRoadmap } from "@/lib/roadmap/github";
import { STAGES, STALE_AFTER_DAYS } from "@/lib/roadmap/roadmap.mjs";
import { RefreshButton } from "./refresh-button";
import { ErrorCard, FOCUS, LINK, StageCell, StaleFlag, summarize, type SummaryRow } from "./roadmap-parts";

export const dynamic = "force-dynamic";

// Owner page: every ecosystem app's roadmap, read from the `docs/roadmap.md` each repo keeps
// (Roadmap rule, docs/shared-rules.md v10). Registry: lib/roadmap/registry.ts. GitHub reads are
// cached for an hour; "Refresh now" expires them.

const FILTERS = ["all", ...STAGES, "none"] as const;
type Filter = (typeof FILTERS)[number];

function filterLabel(f: Filter): string {
  if (f === "all") return "All";
  if (f === "none") return "No stage";
  return f[0].toUpperCase() + f.slice(1);
}

function matches(f: Filter, row: SummaryRow): boolean {
  if (f === "all") return true;
  if (f === "none") return row.stage === null;
  return row.stage === f;
}

function count(n: number | null): string {
  return n === null ? "" : String(n);
}

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(stage ?? "") ? (stage as Filter) : "all";
  const { tokenSet, apps } = await loadRoadmapOverview();
  const rows = apps.map((a) => ({ a, row: summarize(a) }));
  const shown = rows.filter(({ row }) => matches(filter, row));
  const problems = apps.filter((a) => a.state === "invalid" || a.state === "error");
  const tally = (f: Filter) => rows.filter(({ row }) => matches(f, row)).length;

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Ecosystem roadmap</h1>
          <p className="mt-1 text-sm text-slate-400">
            Each app&apos;s <span className="font-mono">docs/roadmap.md</span> on <span className="font-mono">main</span>,
            read from GitHub and cached for an hour. A roadmap is flagged when main has commits more than{" "}
            {STALE_AFTER_DAYS} days newer than the file&apos;s last change.
          </p>
        </div>
        <RefreshButton />
      </header>

      {!tokenSet ? (
        <p className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
          <strong className="font-semibold">Roadmaps are not being read.</strong> Set{" "}
          <span className="font-mono">GITHUB_ROADMAP_TOKEN</span> in the witus Vercel project (task 132). Until then
          this page lists the registry only.
        </p>
      ) : null}

      <nav aria-label="Filter by stage">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <li key={f}>
              <Link
                href={f === "all" ? "/admin/roadmap" : `/admin/roadmap?stage=${f}`}
                aria-current={f === filter ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${FOCUS} ${
                  f === filter
                    ? "border-teal-400 bg-teal-900/50 text-teal-100"
                    : "border-slate-700 text-slate-300 hover:border-teal-400"
                }`}
              >
                {filterLabel(f)} <span className="ml-1.5 text-xs text-slate-400">{tally(f)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="sr-only">
        Showing {shown.length} of {apps.length} apps.
      </p>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-slate-800 px-4 py-6 text-sm text-slate-400">No apps at this stage.</p>
      ) : (
        <>
          {/* Phones: one card per app. */}
          <ul className="space-y-3 md:hidden">
            {shown.map(({ a, row }) => (
              <li key={a.app.slug} className="rounded-lg border border-slate-800 p-4">
                <AppLink a={a} />
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-slate-400">Stage</dt>
                  <dd><StageCell app={a} row={row} /></dd>
                  <dt className="text-slate-400">Live / in progress</dt>
                  <dd className="text-slate-200">{row.live === null ? "" : `${row.live} / ${row.inProgress}`}</dd>
                  <dt className="text-slate-400">Blocked on</dt>
                  <dd className="text-slate-200">{count(row.blocked)}</dd>
                  <dt className="text-slate-400">Updated</dt>
                  <dd className="text-slate-200">{row.updated ?? ""}</dd>
                  <dt className="text-slate-400">Staleness</dt>
                  <dd><StaleFlag stale={a.stale} /></dd>
                </dl>
                {row.next ? <p className="mt-2 text-sm text-slate-300"><span className="text-slate-400">Next: </span>{row.next}</p> : null}
              </li>
            ))}
          </ul>

          {/* Tablet and up: the summary table. */}
          <table className="hidden w-full text-left text-sm md:table">
            <caption className="sr-only">Roadmap summary, one row per app</caption>
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">App</th>
                <th scope="col" className="py-2 pr-3 font-medium">Stage</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Live</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">In progress</th>
                <th scope="col" className="py-2 pr-3 font-medium">Next</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Blocked</th>
                <th scope="col" className="py-2 pr-3 font-medium">Updated</th>
                <th scope="col" className="py-2 font-medium">Stale?</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ a, row }) => (
                <tr key={a.app.slug} className="border-b border-slate-800 align-top">
                  <th scope="row" className="py-2 pr-3 font-normal"><AppLink a={a} /></th>
                  <td className="py-2 pr-3"><StageCell app={a} row={row} /></td>
                  <td className="py-2 pr-3 text-right text-slate-200">{count(row.live)}</td>
                  <td className="py-2 pr-3 text-right text-slate-200">{count(row.inProgress)}</td>
                  <td className="max-w-xs py-2 pr-3 text-slate-300">{row.next ?? ""}</td>
                  <td className="py-2 pr-3 text-right text-slate-200">{count(row.blocked)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-300">{row.updated ?? ""}</td>
                  <td className="py-2"><StaleFlag stale={a.stale} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {problems.length ? (
        <section aria-labelledby="problems" className="space-y-3">
          <h2 id="problems" className="text-lg font-semibold text-slate-100">Files that need fixing</h2>
          {problems.map((a) => (
            <ErrorCard key={a.app.slug} app={a} />
          ))}
        </section>
      ) : null}

      <p className="text-xs text-slate-400">
        Format and rule: <span className="font-mono">docs/shared-rules.md</span> (Roadmap rule). Apps with no repo keep
        their file in this repo under <span className="font-mono">docs/roadmaps/</span>. Registry:{" "}
        <span className="font-mono">lib/roadmap/registry.ts</span>.
      </p>
    </main>
  );
}

function AppLink({ a }: { a: AppRoadmap }) {
  return (
    <Link href={`/admin/roadmap/${a.app.slug}`} className={`font-semibold ${LINK}`}>
      {a.roadmap?.meta.name ?? a.app.name}
    </Link>
  );
}
