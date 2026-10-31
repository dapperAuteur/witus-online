import { groupByApp, plainPreview, sortTasks, TIERS } from "@/lib/operator-tasks/core.mjs";
import type { TaskListRow } from "@/lib/operator-tasks/queries";
import { TaskItem, TierBadge, type TaskItemData } from "./task-item";

/** Tasks shown per app before "Show N more". Keeps the phone page short. */
const VISIBLE_PER_APP = 5;

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function toItem(t: TaskListRow & { tier: number; tierLabel: string }): TaskItemData {
  return {
    key: t.key,
    number: t.number,
    title: t.title,
    tier: t.tier,
    tierLabel: t.tierLabel,
    blocksPreview: plainPreview(t.blocks, 220),
    statusPreview: plainPreview(t.status, 140),
    file: t.file,
    repoPath: t.repoPath,
    hasBody: t.hasBody,
    bodyWithheld: t.bodyWithheld,
    doneAt: t.doneAt ? t.doneAt.toISOString() : null,
    doneBy: t.doneBy,
  };
}

export function Notice({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-red-800 bg-red-950/50 text-red-100" : "border-amber-700 bg-amber-950/50 text-amber-100";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

/** The Tasks tab for a non-empty list of synced rows. Split from page.tsx so it renders without a database. */
export function TasksView({ rows, lastSync }: { rows: TaskListRow[]; lastSync: Date | null }) {
  const open = rows.filter((r) => !r.doneAt && !r.unindexed);
  const unindexed = rows.filter((r) => !r.doneAt && r.unindexed);
  const done = sortTasks(rows.filter((r) => r.doneAt));
  const groups = groupByApp(open);
  const tierCounts = TIERS.map((label, tier) => ({
    label,
    tier,
    count: groups.reduce((n, g) => n + g.tasks.filter((t) => t.tier === tier).length, 0),
  }));
  const unindexedGroups = groupByApp(unindexed);
  const staleHours = lastSync ? (Date.now() - lastSync.getTime()) / 3_600_000 : null;

  return (
    <div className="space-y-8">
      <section aria-labelledby="sync-heading" className="space-y-3">
        <h2 id="sync-heading" className="sr-only">
          Sync status
        </h2>
        <p className="text-sm text-slate-300">
          {open.length} open in {groups.length} apps
          {lastSync ? <> · synced {dateFmt.format(lastSync)} UTC</> : null}
        </p>
        {staleHours !== null && staleHours > 24 ? (
          <Notice tone="amber">
            <p>
              The last sync was {Math.floor(staleHours / 24)} day{staleHours >= 48 ? "s" : ""} ago, so this list may be
              out of date. Run <span className="font-mono">node scripts/sync-user-tasks.mjs</span> on the laptop.
            </p>
          </Notice>
        ) : null}
        <ul className="flex flex-wrap gap-2" aria-label="Open tasks by urgency">
          {tierCounts
            .filter((t) => t.count > 0)
            .map((t) => (
              <li key={t.tier} className="flex items-center gap-1.5 text-sm text-slate-300">
                <TierBadge tier={t.tier} label={t.label} />
                <span>{t.count}</span>
              </li>
            ))}
        </ul>
        <p className="text-xs text-slate-500">
          Urgency is a guess from each row&apos;s words (security, failed, launch, deadline). Mark done records your click;
          the next local sync moves the file to completed/.
        </p>
      </section>

      <section aria-labelledby="do-now-heading" className="space-y-6">
        <h2 id="do-now-heading" className="text-xl font-semibold tracking-tight text-slate-100">
          Do now
        </h2>
        {groups.map((g) => {
          const head = g.tasks.slice(0, VISIBLE_PER_APP);
          const rest = g.tasks.slice(VISIBLE_PER_APP);
          const headingId = `app-${g.app}`;
          return (
            <section key={g.app} aria-labelledby={headingId} className="space-y-2">
              <h3 id={headingId} className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-slate-100">
                {g.appName}
                <span className="text-sm font-normal text-slate-400">
                  {g.tasks.length} open{g.urgent ? `, ${g.urgent} urgent` : ""}
                </span>
              </h3>
              <ul className="space-y-2">
                {head.map((t) => (
                  <TaskItem key={t.key} task={toItem(t)} />
                ))}
              </ul>
              {rest.length > 0 ? (
                <details className="rounded-lg">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-1 text-sm font-semibold text-teal-300 hover:text-teal-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
                    Show {rest.length} more in {g.appName}
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {rest.map((t) => (
                      <TaskItem key={t.key} task={toItem(t)} />
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          );
        })}
      </section>

      {done.length > 0 ? (
        <section aria-labelledby="done-heading" className="space-y-2">
          <h2 id="done-heading" className="text-xl font-semibold tracking-tight text-slate-100">
            Marked done here, waiting for the local sync ({done.length})
          </h2>
          <p className="text-sm text-slate-400">
            The next <span className="font-mono">node scripts/sync-user-tasks.mjs</span> lists these so Claude moves each
            file to completed/; then they drop off.
          </p>
          <ul className="space-y-2">
            {done.map((t) => (
              <TaskItem key={t.key} task={toItem(t)} />
            ))}
          </ul>
        </section>
      ) : null}

      {unindexed.length > 0 ? (
        <section aria-labelledby="unindexed-heading" className="space-y-2">
          <h2 id="unindexed-heading" className="text-xl font-semibold tracking-tight text-slate-100">
            Not in any index ({unindexed.length})
          </h2>
          <p className="text-sm text-slate-400">
            Task files in a queue&apos;s folder that its <span className="font-mono">00-descriptions.md</span> does not list.
            Most are finished work never moved to completed/; a session should index or close them.
          </p>
          {unindexedGroups.map((g) => (
            <details key={g.app} className="rounded-lg border border-slate-800">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-slate-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
                {g.appName} ({g.tasks.length})
              </summary>
              <ul className="space-y-2 px-3 pb-3">
                {g.tasks.map((t) => (
                  <TaskItem key={t.key} task={toItem(t)} showStatus={false} />
                ))}
              </ul>
            </details>
          ))}
        </section>
      ) : null}
    </div>
  );
}
