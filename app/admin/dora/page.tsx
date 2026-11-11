import { Suspense } from "react";
import Link from "next/link";
import { getDb } from "@/db";
import { getEnv } from "@/lib/env";
import { COORDINATION_SLUG, loadDoraCredits, loadDoraOverview, type AppDora, type WindowCredits } from "@/lib/ops/dora";
import { costPerChange, summarize, weeklyChanges } from "@/lib/ops/dora-core.mjs";
import { LoadingRow } from "../loading-row";
import { RefreshButton } from "../tasks/refresh-button";
import { credits, DoraRow, DoraTableHead, ErrorRow, link, OpenFailure, type RowCost, type RowNumbers } from "./dora-parts";

export const dynamic = "force-dynamic";

const DOC_URL = "https://github.com/dapperAuteur/witus-online/blob/main/docs/02-dora-metrics.md";

function NoToken() {
  return (
    <p className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
      DORA metrics are not being read: <span className="font-mono">GITHUB_ROADMAP_TOKEN</span> is not set (task 132).
    </p>
  );
}

/** The heading, window links, Refresh button and definitions render at once; the reads stream in. */
export default async function DoraPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const { window } = await searchParams;
  const days = window === "90" ? 90 : 30;
  const tokenSet = Boolean(getEnv().GITHUB_ROADMAP_TOKEN);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl min-w-0 flex-1 space-y-6 px-4 py-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">DORA metrics</h1>
        <p className="text-sm text-slate-300">
          How often each app ships, how long a change takes, how often a deploy fails and how fast it is fixed, how much
          is rework, and what a change costs in Claude credits. Read-only, from GitHub and the usage archive, cached five
          minutes. These are observations, not targets. Live deploy state is on{" "}
          <Link href="/admin/tasks/deploys" className={link}>Deploys</Link>.
        </p>
      </header>
      <nav aria-label="Window" className="flex flex-wrap items-center gap-2">
        {[30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin/dora?window=${d}`}
            aria-current={d === days ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${
              d === days ? "bg-slate-800 text-teal-200" : "text-slate-300 hover:text-teal-300"
            }`}
          >
            Last {d} days
          </Link>
        ))}
        {tokenSet ? <RefreshButton /> : null}
      </nav>
      {tokenSet ? (
        <Suspense fallback={<LoadingRow label="Reading deployments, commits and workflow runs from GitHub…" />}>
          <DoraBody days={days} />
        </Suspense>
      ) : (
        <NoToken />
      )}
      <Definitions />
    </main>
  );
}

const ZERO_COST: RowCost = { direct: "none", allIn: "none" };

async function DoraBody({ days }: { days: number }) {
  const [overview, creditData] = await Promise.all([loadDoraOverview(), loadDoraCredits(getDb())]);
  if (!overview.tokenSet) return <NoToken />;
  const now = Date.now();
  const readable = overview.apps.filter((a) => a.readOk);
  const eco = summarize(readable.map((a) => a.timeline), now, days) as RowNumbers;
  const win = creditData.status === "ok" ? creditData.windows[days] : null;
  const coordination = win?.coordination.credits ?? 0;
  const appCredits = (slug: string) => win?.byApp.get(slug)?.credits ?? 0;
  const total = win ? [...win.byApp.values()].reduce((s, b) => s + b.credits, 0) + coordination + win.unmapped.credits : 0;
  const unpriced = win ? [...win.byApp.values()].reduce((s, b) => s + b.unpriced, 0) + win.coordination.unpriced + win.unmapped.unpriced : 0;

  const rows = overview.apps
    .map((a) => ({ a, n: summarize([a.timeline], now, days) as RowNumbers }))
    .sort((x, y) => Number(y.a.readOk) - Number(x.a.readOk) || y.n.changes - x.n.changes || x.a.name.localeCompare(y.a.name));
  const open = readable.flatMap((a) => a.timeline.episodes.filter((e) => e.end == null).map((e) => ({ a, e }))).sort((x, y) => x.e.start - y.e.start);

  const costOf = (a: AppDora, n: RowNumbers): RowCost => {
    if (!win) return ZERO_COST;
    const c = costPerChange({ appCredits: appCredits(a.slug), appChanges: n.changes, coordinationCredits: coordination, allChanges: eco.changes });
    if (a.slug === COORDINATION_SLUG) return { direct: "in coordination", allIn: credits(c.allIn) };
    const b = win.byApp.get(a.slug);
    return { direct: credits(c.direct), allIn: credits(c.allIn), note: b?.unpriced ? `${b.unpriced} unpriced responses` : undefined };
  };
  const ecoCost: RowCost = win
    ? { direct: credits(eco.changes ? (total - coordination) / eco.changes : null), allIn: credits(eco.changes ? total / eco.changes : null) }
    : ZERO_COST;

  return (
    <div className="space-y-6">
      {open.length ? (
        <section aria-labelledby="open-heading" className="space-y-2">
          <h2 id="open-heading" className="text-lg font-semibold text-red-200">Failing now</h2>
          <ul className="space-y-2" role="alert">
            {open.map(({ a, e }) => (
              <OpenFailure key={`${a.slug}-${e.sha}-${e.kind}`} name={a.name} repo={a.repo} e={e} now={now} />
            ))}
          </ul>
        </section>
      ) : (
        <p role="status" className="text-sm text-emerald-200">No app has an open production failure.</p>
      )}

      {overview.needsActions ? (
        <p role="alert" className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
          Post-deploy workflow data needs <strong>Actions: Read-only</strong> on <span className="font-mono">GITHUB_ROADMAP_TOKEN</span>{" "}
          (task 159). Until then a failed migration, seed or sync is not counted, and failures and recovery come from Production
          deployment statuses only. Everything else on this page is complete.
        </p>
      ) : null}

      <CostNote status={creditData.status} earliest={creditData.status === "ok" ? creditData.earliest : null} days={days} win={win} total={total} unpriced={unpriced} />

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[56rem] text-sm text-slate-200">
          <caption className="sr-only">DORA metrics for the last {days} days, ecosystem first, then one row per app</caption>
          <DoraTableHead />
          <tbody>
            <DoraRow label="Ecosystem" sub={<p>{readable.length} repos read</p>} n={eco} cost={ecoCost} bars={days === 90 ? weeklyChanges(readable.map((a) => a.timeline), now) : undefined} strong />
            {rows.map(({ a, n }) =>
              a.readOk ? (
                <DoraRow
                  key={a.repo}
                  label={a.name}
                  sub={<AppNotes a={a} />}
                  n={n}
                  cost={costOf(a, n)}
                  bars={days === 90 ? weeklyChanges([a.timeline], now) : undefined}
                />
              ) : (
                <ErrorRow key={a.repo} label={a.name} message={a.error ?? "Could not be read."} />
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Read from GitHub at {overview.readAt.slice(11, 16)} UTC.</p>
    </div>
  );
}

function AppNotes({ a }: { a: AppDora }) {
  const post =
    a.actions === "needs-permission"
      ? "Post-deploy: needs Actions read on the token"
      : a.workflows && a.workflows.length
        ? `Post-deploy: ${a.workflows.join(", ")}`
        : a.workflows
          ? "No post-deploy workflows"
          : null;
  return (
    <>
      <p>
        <a href={`https://github.com/${a.repo}`} target="_blank" rel="noopener noreferrer" className={link}>
          {a.repo.split("/")[1]}
          <span className="sr-only"> on GitHub (opens in new tab)</span>
        </a>
      </p>
      {post ? <p>{post}</p> : null}
      {a.source === "none" ? <p>No production deploys found</p> : null}
      {a.notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      {a.error ? <p className="text-amber-200">{a.error}</p> : null}
    </>
  );
}

function CostNote({
  status,
  earliest,
  days,
  win,
  total,
  unpriced,
}: {
  status: string;
  earliest: string | null;
  days: number;
  win: WindowCredits | null;
  total: number;
  unpriced: number;
}) {
  if (status === "no-table") return <p className="text-sm text-amber-200">The usage archive table is not in this database yet, so credits per change are blank.</p>;
  if (status !== "ok" || !win) return <p className="text-sm text-amber-200">The usage archive could not be read, so credits per change are blank.</p>;
  const startsLate = earliest && Date.parse(earliest) > Date.now() - days * 86_400_000;
  return (
    <section className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
      <h2 className="font-medium text-slate-100">Claude credits in the last {days} days: {credits(total)}</h2>
      <p>
        Coordination (the witus sessions and the helpers they start): {credits(win.coordination.credits)}, of which helpers{" "}
        {credits(win.coordination.helperCredits)}. It is spread evenly over every change for the all-in figure. Not mapped to a
        repo: {credits(win.unmapped.credits)}
        {win.unmapped.projects.length ? ` (${win.unmapped.projects.map((p) => p.replace(/^-Users-bam-Code[-_]NOiCloud-/, "")).join(", ")})` : ""}.
      </p>
      <p className="text-xs text-slate-400">
        1 credit = 1 US dollar of API list price. {unpriced ? `${unpriced} responses use a model missing from the price table and are counted at zero. ` : "Every response in the window is priced. "}
        {startsLate ? `The archive starts ${earliest?.slice(0, 10)}, so this window is shorter than ${days} days. ` : ""}
        Details on <Link href="/admin/usage" className={link}>Usage</Link>.
      </p>
    </section>
  );
}

function Definitions() {
  return (
    <section aria-labelledby="defs-heading" className="space-y-2 rounded-lg border border-slate-800 p-4 text-sm text-slate-300">
      <h2 id="defs-heading" className="font-semibold text-slate-100">Definitions, short</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Change</strong>: a commit&apos;s first successful Production deployment of main. A redeploy of a live commit is not a change. Repos with GitHub deployments off use Vercel&apos;s commit status on main.</li>
        <li><strong>Authoring</strong>: oldest to newest author date among the change&apos;s commits (merge commits skipped). <strong>Merge wait</strong>: newest commit to the deployment&apos;s success.</li>
        <li><strong>Change fail rate</strong>: commits that failed out of commits that tried to deploy. Failed means a failure or error deployment status, a failed migrate, seed or sync run on that commit, or the next change within 24 hours being only fix, hotfix or revert commits.</li>
        <li><strong>Recovery</strong>: first failure to the next moment the app is green again, a successful deployment with its post-deploy runs green, or a successful re-run of the failed workflow.</li>
        <li><strong>Rework rate</strong>: changes made only of fix commits within 24 hours of the previous change.</li>
        <li><strong>Credits per change</strong>: an app&apos;s own Claude credits over its changes (direct), plus an even share of coordination (all-in).</li>
        <li>The published elite, high, medium and low tiers are team benchmarks and are not targets here. Batching and the between-session merge rhythm move frequency and lead time on purpose. Outages a deploy did not cause are not in these numbers.</li>
      </ul>
      <p>
        Full definitions and pitfalls:{" "}
        <a href={DOC_URL} target="_blank" rel="noopener noreferrer" className={link}>
          docs/02-dora-metrics.md<span className="sr-only"> (opens in new tab)</span>
        </a>
        .
      </p>
    </section>
  );
}
