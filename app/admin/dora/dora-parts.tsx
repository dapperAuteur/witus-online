import type { DoraEpisode } from "@/lib/ops/dora";

/** One row's numbers, already windowed (lib/ops/dora-core.mjs summarize plus cost). */
export type RowNumbers = {
  changes: number;
  perWeek: number;
  authoring: { median: number | null; p90: number | null; n: number };
  mergeWait: { median: number | null; p90: number | null; n: number };
  attempts: number;
  failed: number;
  changeFailRate: number | null;
  recovery: { median: number | null; p90: number | null; n: number };
  openFailures: number;
  rework: number;
  reworkRate: number | null;
};

export type RowCost = { direct: string; allIn: string; note?: string };

export const link =
  "underline decoration-slate-600 underline-offset-2 hover:text-teal-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";
const th = "py-2 pr-3 text-left align-bottom font-medium";
const td = "py-2 pr-3 align-top";
const num = "py-2 pr-3 align-top tabular-nums";

/** "35 min", "4.2 h", "3.1 d"; "none" when there is nothing to measure. */
export function duration(ms: number | null): string {
  if (ms == null) return "none";
  const min = ms / 60_000;
  if (min < 1) return "under 1 min";
  if (min < 90) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

/** "17% (3 of 18)"; "none" with no denominator. */
export function rate(r: number | null, part: number, whole: number): string {
  if (r == null || whole === 0) return "none";
  return `${Math.round(r * 100)}% (${part} of ${whole})`;
}

const creditFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const credits = (n: number | null): string => (n == null ? "none" : creditFmt.format(n));

export function Sha({ repo, sha }: { repo: string; sha: string }) {
  return (
    <a href={`https://github.com/${repo}/commit/${sha}`} target="_blank" rel="noopener noreferrer" className={`font-mono ${link}`}>
      {sha.slice(0, 7)}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

/** Changes per week, oldest first, as small bars. Decorative: the count beside it is the data. */
export function Bars({ bars }: { bars: number[] }) {
  const max = Math.max(1, ...bars);
  return (
    <span aria-hidden="true" title="Changes per week, last 13 weeks" className="mt-1 flex h-4 items-end gap-px">
      {bars.map((b, i) => (
        <span key={i} className="w-1 rounded-sm bg-teal-500/80" style={{ height: `${b === 0 ? 6 : Math.max(12, (b / max) * 100)}%`, opacity: b === 0 ? 0.3 : 1 }} />
      ))}
    </span>
  );
}

export function DoraTableHead() {
  return (
    <thead>
      <tr className="border-b border-slate-800 text-slate-400">
        <th scope="col" className={th}>App</th>
        <th scope="col" className={th}>Changes</th>
        <th scope="col" className={th}>Authoring<br /><span className="text-xs font-normal">median, p90</span></th>
        <th scope="col" className={th}>Merge wait<br /><span className="text-xs font-normal">median, p90</span></th>
        <th scope="col" className={th}>Change fail rate</th>
        <th scope="col" className={th}>Recovery<br /><span className="text-xs font-normal">median, p90</span></th>
        <th scope="col" className={th}>Rework rate</th>
        <th scope="col" className={th}>Credits per change<br /><span className="text-xs font-normal">direct, all-in</span></th>
      </tr>
    </thead>
  );
}

export function DoraRow({
  label,
  sub,
  n,
  cost,
  bars,
  strong = false,
}: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  n: RowNumbers;
  cost: RowCost;
  bars?: number[];
  strong?: boolean;
}) {
  return (
    <tr className={`border-b border-slate-800/60 ${strong ? "bg-slate-900/60 font-semibold" : ""}`}>
      <th scope="row" className={`${td} min-w-40 text-left font-normal`}>
        <span className={strong ? "font-semibold text-slate-100" : "text-slate-100"}>{label}</span>
        {sub ? <div className="mt-1 space-y-0.5 text-xs font-normal text-slate-400">{sub}</div> : null}
      </th>
      <td className={num}>
        {n.changes}
        <span className="block text-xs font-normal text-slate-400">{n.perWeek.toFixed(1)} a week</span>
        {bars ? <Bars bars={bars} /> : null}
      </td>
      <td className={num}>
        {duration(n.authoring.median)}
        <span className="block text-xs font-normal text-slate-400">{duration(n.authoring.p90)}</span>
      </td>
      <td className={num}>
        {duration(n.mergeWait.median)}
        <span className="block text-xs font-normal text-slate-400">{duration(n.mergeWait.p90)}</span>
      </td>
      <td className={num}>{rate(n.changeFailRate, n.failed, n.attempts)}</td>
      <td className={num}>
        {duration(n.recovery.median)}
        <span className="block text-xs font-normal text-slate-400">
          {duration(n.recovery.p90)}
          {n.openFailures ? <span className="text-red-300">, {n.openFailures} open</span> : null}
        </span>
      </td>
      <td className={num}>{rate(n.reworkRate, n.rework, n.changes)}</td>
      <td className={num}>
        {cost.direct}
        <span className="block text-xs font-normal text-slate-400">{cost.allIn}</span>
        {cost.note ? <span className="block text-xs font-normal text-slate-500">{cost.note}</span> : null}
      </td>
    </tr>
  );
}

export function ErrorRow({ label, message }: { label: string; message: string }) {
  return (
    <tr className="border-b border-slate-800/60">
      <th scope="row" className={`${td} text-left font-normal text-slate-100`}>{label}</th>
      <td colSpan={7} className={`${td} text-amber-200`}>{message}</td>
    </tr>
  );
}

export const kindText = (kind: string) => (kind === "deploy" ? "Production deployment failed" : `${kind.replace(/^workflow:/, "")} failed`);

/** "since 2026-11-10 23:43 UTC (1.2 h)". */
export function since(start: number, now: number) {
  return `since ${new Date(start).toISOString().slice(0, 16).replace("T", " ")} UTC (${duration(now - start)})`;
}

export function OpenFailure({ name, repo, e, now }: { name: string; repo: string; e: DoraEpisode; now: number }) {
  return (
    <li className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-100">
      <span className="font-semibold">{name}</span>: {kindText(e.kind)} on <Sha repo={repo} sha={e.sha} />, {since(e.start, now)}
      {e.failures > 1 ? `, ${e.failures} failures since` : ""}
      {e.url ? (
        <>
          {" · "}
          <a href={e.url} target="_blank" rel="noopener noreferrer" className={link}>
            Log<span className="sr-only"> of the failure (opens in new tab)</span>
          </a>
        </>
      ) : null}
      {now - e.start > 60 * 60_000 ? <span className="block text-xs text-red-200/80">Past 60 minutes: the hourly alarm emails this once.</span> : null}
    </li>
  );
}
