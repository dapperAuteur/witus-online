import Link from "next/link";
import { getDb } from "@/db";
import { getEnv } from "@/lib/env";
import {
  CREDIT_DEFINITION,
  PUSH_COMMAND,
  count,
  credits,
  latestClaudeUsageSnapshot,
  monthKey,
  percent,
  stamp,
  tokensOf,
  type UsageBucket,
} from "@/lib/claude-usage/snapshot";

export const dynamic = "force-dynamic";

// Owner page: Claude Code usage and the cost of Claude's mistakes, in credits. The data is a
// snapshot pushed from BAM's machine by scripts/usage-report.mjs --push (the transcripts never leave
// that machine; only token counts, timestamps, model ids and the ledger rows BAM wrote arrive here).
// A plain server component: the only interaction is the native <details> toggle for the long tables.
// Gated by app/admin/layout.tsx (ADMIN_EMAIL), like every page under /admin.

const tile = "rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-slate-200";
const th = "py-2 pr-3 font-medium";
const td = "py-2 pr-3 align-top";
const num = "py-2 pr-3 text-right tabular-nums align-top";

function BucketTable({ label, rows, total, mark }: { label: string; rows: [string, UsageBucket][]; total?: UsageBucket; mark?: (k: string) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-slate-400">
            <th className={th}>{label}</th>
            <th className={`${th} text-right`}>Responses</th>
            <th className={`${th} text-right`}>Input</th>
            <th className={`${th} text-right`}>Cache write 5m</th>
            <th className={`${th} text-right`}>Cache write 1h</th>
            <th className={`${th} text-right`}>Cache read</th>
            <th className={`${th} text-right`}>Output</th>
            <th className={`${th} text-right`}>Credits</th>
          </tr>
        </thead>
        <tbody className="text-slate-200">
          {rows.map(([k, b]) => (
            <tr key={k} className="border-b border-slate-800/60">
              <td className={`${td} font-mono text-xs`}>{mark ? mark(k) : k}</td>
              <td className={num}>{count(b.responses)}</td>
              <td className={num}>{count(b.input)}</td>
              <td className={num}>{count(b.cacheWrite5m)}</td>
              <td className={num}>{count(b.cacheWrite1h)}</td>
              <td className={num}>{count(b.cacheRead)}</td>
              <td className={num}>{count(b.output)}</td>
              <td className={num}>
                {credits(b.usd)}
                {b.unpriced ? <span className="ml-1 text-xs text-slate-500">({count(b.unpriced)} unpriced)</span> : null}
              </td>
            </tr>
          ))}
          {total ? (
            <tr className="font-semibold">
              <td className={td}>All</td>
              <td className={num}>{count(total.responses)}</td>
              <td className={num}>{count(total.input)}</td>
              <td className={num}>{count(total.cacheWrite5m)}</td>
              <td className={num}>{count(total.cacheWrite1h)}</td>
              <td className={num}>{count(total.cacheRead)}</td>
              <td className={num}>{count(total.output)}</td>
              <td className={num}>{credits(total.usd)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function HowToUpdate() {
  return (
    <section className={tile}>
      <h2 className="text-sm font-medium text-slate-100">How to update</h2>
      <p className="mt-1 text-sm text-slate-400">
        On the machine that holds the Claude Code transcripts, from any repo or chat:
      </p>
      <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 font-mono text-xs text-slate-200">{PUSH_COMMAND}</pre>
      <p className="mt-2 text-xs text-slate-500">
        Add <span className="font-mono">--md</span> to also write the Markdown report. The script reads the transcripts
        read-only, de-duplicates by message id, prices from <span className="font-mono">scripts/lib/claude-prices.json</span>, sums
        the ledger in <span className="font-mono">plans/usage-reports/mistakes.jsonl</span>, and inserts one row here. Local
        transcripts are deleted after Claude Code&apos;s cleanup period (default 30 days); the pushed snapshot is the durable copy.
      </p>
    </section>
  );
}

export default async function UsagePage() {
  const env = getEnv();
  const allowance = env.CLAUDE_MONTHLY_ALLOWANCE_CREDITS;
  const latest = await latestClaudeUsageSnapshot(getDb());
  const thisMonth = monthKey(new Date());

  return (
    <main id="main" className="mx-auto max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Claude Code usage and mistake cost</h1>
        <p className="mt-1 text-sm text-slate-400">
          Token usage from the local Claude Code transcripts, one record per API response, priced at API list price and
          shown in <strong className="text-slate-200">credits</strong>: {CREDIT_DEFINITION}. That matches how Anthropic prices
          usage credits (prepaid extra usage on Pro and Max, billed at standard API rates). Usage inside the plan&apos;s
          five-hour and weekly allowance is not billed per token at all, so every figure here is API-equivalent, not what
          the plan charges. The mistake ledger is the set of detours BAM reported, each summed over its window of the
          transcript; every ledger figure is an estimate. Vendor bills are on <Link className="text-teal-300 underline" href="/admin/costs">Costs</Link>.
        </p>
      </header>

      {latest.status === "no-table" ? (
        <>
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-medium">The claude_usage_snapshots table is not in this database yet.</p>
            <p className="mt-1 text-amber-200/80">
              Apply migration 0007 first (<span className="font-mono">npm run db:migrate</span> from the witus repo root, the way
              migration 0006 was applied), then push a snapshot with the command below.
            </p>
          </section>
          <HowToUpdate />
        </>
      ) : latest.status === "empty" ? (
        <>
          <section className={tile}>
            <p className="text-sm text-slate-300">No snapshot yet. Nothing has been pushed to this database.</p>
            <p className="mt-1 text-xs text-slate-500">
              {allowance
                ? `Monthly allowance is set to ${credits(allowance)} credits; the percentage appears once a snapshot exists.`
                : "To see used-this-month as a percentage, set CLAUDE_MONTHLY_ALLOWANCE_CREDITS (Vercel env, Production) to the plan's monthly allowance in credits."}
            </p>
          </section>
          <HowToUpdate />
        </>
      ) : (
        <UsageBody latest={latest} thisMonth={thisMonth} allowance={allowance} />
      )}
    </main>
  );
}

function UsageBody({
  latest,
  thisMonth,
  allowance,
}: {
  latest: Extract<Awaited<ReturnType<typeof latestClaudeUsageSnapshot>>, { status: "ok" }>;
  thisMonth: string;
  allowance: number | undefined;
}) {
  const { row, detail } = latest;
  const byMonth = Object.entries(detail.byMonth ?? {});
  const byModel = Object.entries(detail.byModel ?? {});
  const byProject = Object.entries(detail.byProject ?? {});
  const unpriced = new Set((detail.unpricedModels ?? []).map((u) => u.model));
  const month = detail.byMonth?.[thisMonth];
  const monthUsd = month?.usd ?? 0;
  const ledgerRows = detail.ledger?.rows ?? [];
  const share = Number(row.mistakeShare ?? 0);
  const listedNotCounted = detail.ledger?.listedNotCounted;
  const total: UsageBucket = {
    responses: row.responses,
    input: row.inputTokens,
    cacheWrite5m: row.cacheWrite5mTokens,
    cacheWrite1h: row.cacheWrite1hTokens,
    cacheRead: row.cacheReadTokens,
    output: row.outputTokens,
    usd: Number(row.listPriceUsd),
    unpriced: (detail.unpricedModels ?? []).reduce((s, u) => s + u.responses, 0),
  };

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className={tile}>
          <dt className="text-slate-400">Latest snapshot</dt>
          <dd className="font-medium">{stamp(row.takenAt)}</dd>
          <dd className="text-xs text-slate-500">
            {row.machine}; covers {stamp(row.coverageStart).slice(0, 10)} to {stamp(row.coverageEnd).slice(0, 10)}
          </dd>
        </div>
        <div className={tile}>
          <dt className="text-slate-400">This month ({thisMonth})</dt>
          <dd className="text-lg font-semibold">
            {credits(monthUsd)} credits
            {allowance ? <span className="ml-1 text-sm font-normal text-slate-400">of {credits(allowance)} ({percent(monthUsd / allowance)})</span> : null}
          </dd>
          <dd className="text-xs text-slate-500">
            {month
              ? `${count(month.responses)} responses as of the snapshot`
              : "no usage for this month in the latest snapshot; push a new one"}
            {allowance ? "" : ". Set CLAUDE_MONTHLY_ALLOWANCE_CREDITS (Vercel env) to see this as a share of the plan's monthly allowance"}
          </dd>
        </div>
        <div className={tile}>
          <dt className="text-slate-400">Mistake ledger</dt>
          <dd className="text-lg font-semibold">{credits(row.mistakePriceUsd)} credits</dd>
          <dd className="text-xs text-slate-500">
            {percent(share)} of all usage; {ledgerRows.filter((r) => r.counted).length} counted of {ledgerRows.length} rows
          </dd>
        </div>
        <div className={tile}>
          <dt className="text-slate-400">All usage on disk</dt>
          <dd className="text-lg font-semibold">{credits(row.listPriceUsd)} credits</dd>
          <dd className="text-xs text-slate-500">
            {count(row.responses)} responses, {count(tokensOf(total))} tokens
          </dd>
        </div>
      </dl>

      <HowToUpdate />

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-100">By month</h2>
        <BucketTable label="Month" rows={byMonth} total={total} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-100">By model</h2>
        <BucketTable label="Model" rows={byModel} mark={(k) => (unpriced.has(k) ? `${k} (not in price table, unpriced)` : k)} />
        <p className="text-xs text-slate-500">
          Prices: {detail.prices?.source ?? "see scripts/lib/claude-prices.json"} Cached {detail.prices?.cached ?? "unknown"}. A model
          id the table lacks is listed unpriced and counted as zero, never guessed.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-100">Mistake ledger</h2>
        <p className="text-sm text-slate-400">
          One row per detour, summed over its window of the session transcript (scope &quot;main&quot; is the session file alone;
          &quot;with-subagents&quot; adds its subagent files). Rows whose transcript is no longer on disk show zero, not an estimate.
          Counted rows make the total above; the others are listed for the record.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className={th}>Date</th>
                <th className={th}>Id</th>
                <th className={th}>Repo</th>
                <th className={th}>What went wrong</th>
                <th className={`${th} text-right`}>Credits</th>
                <th className={th}>Counted</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {ledgerRows.length === 0 ? (
                <tr>
                  <td className={td} colSpan={6}>
                    <span className="text-slate-500">No ledger rows in this snapshot. Add rows to plans/usage-reports/mistakes.jsonl and push again.</span>
                  </td>
                </tr>
              ) : null}
              {ledgerRows.map((r) => (
                <tr key={r.id} className={`border-b border-slate-800/60 ${r.counted ? "" : "text-slate-400"}`}>
                  <td className={`${td} whitespace-nowrap`}>{r.date}</td>
                  <td className={`${td} font-mono text-xs`}>{r.id}</td>
                  <td className={td}>{r.repo}</td>
                  <td className={td}>
                    {r.description}
                    {r.reported ? <div className="mt-0.5 text-xs text-slate-500">Reported: &quot;{r.reported}&quot;</div> : null}
                  </td>
                  <td className={num}>{credits(r.usd)}</td>
                  <td className={`${td} text-xs`}>
                    {!r.found ? "not found on disk (zero)" : r.counted ? "yes" : `no: ${r.reason ?? ""}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {listedNotCounted ? (
          <p className="text-xs text-slate-500">
            Listed but not counted (origin turns, adjacent episodes, rows not on disk): {credits(listedNotCounted.usd)} credits
            over {count(listedNotCounted.responses)} responses.
          </p>
        ) : null}
      </section>

      <details className="rounded-lg border border-slate-800 p-3 text-sm text-slate-300">
        <summary className="cursor-pointer font-medium text-slate-100">Show detail: by project dir, coverage, caveats</summary>
        <div className="mt-3 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-100">By project dir</h3>
            <p className="mb-2 text-xs text-slate-500">A project dir is the directory a session was started in, not the repo it touched.</p>
            <BucketTable label="Project dir" rows={byProject} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-100">Coverage</h3>
            <p className="text-xs text-slate-400">
              Transcript root <span className="font-mono">{detail.transcriptRoot ?? ""}</span>: {count(detail.files)} files, {count(detail.usageLines)} usage
              lines, {count(row.responses)} API responses after de-duplication. Earliest usage {stamp(row.coverageStart)}; latest {stamp(row.coverageEnd)}.
              {detail.unpricedModels?.length ? ` Unpriced model ids: ${detail.unpricedModels.map((u) => `${u.model} (${count(u.responses)} responses)`).join(", ")}.` : " Every model id in the transcripts is priced."}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-100">What the ledger is and is not</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-400">
              <li>Windows over-count turns that mixed a fix with other work: every response between the report and the fix is in, including re-reads for unrelated items in the same turn.</li>
              <li>They under-count mistakes nobody reported, sessions no longer on disk, second-order cost (BAM&apos;s time at the merge gate, cloud credit, a failed SQL run), and the larger context re-reads in later turns.</li>
              <li>The share is of local transcripts only; the run that produced the snapshot is in the total but in no ledger row.</li>
              <li>Anthropic&apos;s usage page and invoices are the billing record. These are API-equivalent list prices.</li>
            </ul>
          </div>
        </div>
      </details>
    </>
  );
}
