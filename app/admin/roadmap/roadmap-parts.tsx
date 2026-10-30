import type { AppRoadmap, RoadmapState } from "@/lib/roadmap/github";
import { countTopLevel, sectionItems, STALE_AFTER_DAYS } from "@/lib/roadmap/roadmap.mjs";

export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";
export const LINK = `text-teal-300 underline underline-offset-2 hover:text-teal-200 ${FOCUS}`;

/** What the summary table shows for one app. */
export type SummaryRow = {
  stage: string | null;
  live: number | null;
  inProgress: number | null;
  next: string | null;
  blocked: number | null;
  updated: string | null;
};

export function summarize(a: AppRoadmap): SummaryRow {
  const r = a.roadmap;
  if (!r) return { stage: null, live: null, inProgress: null, next: null, blocked: null, updated: null };
  return {
    stage: r.ok ? r.meta.stage : null,
    live: countTopLevel(sectionItems(r, "live")),
    inProgress: countTopLevel(sectionItems(r, "inProgress")),
    next: sectionItems(r, "next").find((i) => i.depth === 0)?.text ?? null,
    blocked: countTopLevel(sectionItems(r, "blocked")),
    updated: r.meta.updated,
  };
}

/** YYYY-MM-DD from an ISO timestamp. */
export function day(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

const STATE_TEXT: Record<RoadmapState, string> = {
  ok: "",
  invalid: "File has errors",
  missing: "No roadmap yet",
  "no-remote": "No GitHub remote",
  "no-token": "Not read (no token)",
  error: "Could not read",
};

/** The stage, or why there is none. */
export function StageCell({ app, row }: { app: AppRoadmap; row: SummaryRow }) {
  if (row.stage) {
    return (
      <span className="inline-flex rounded-full border border-teal-700 px-2 py-0.5 text-xs font-medium text-teal-200">
        {row.stage}
      </span>
    );
  }
  const isProblem = app.state === "invalid" || app.state === "error";
  return <span className={`text-xs ${isProblem ? "text-red-300" : "text-slate-400"}`}>{STATE_TEXT[app.state]}</span>;
}

/** The stale flag, in words (never color alone). */
export function StaleFlag({ stale }: { stale: boolean | null }) {
  if (stale === true) {
    return (
      <span
        className="inline-flex rounded border border-amber-500 px-1.5 py-0.5 text-xs font-medium text-amber-200"
        title={`main has commits more than ${STALE_AFTER_DAYS} days newer than the roadmap file`}
      >
        May be stale
      </span>
    );
  }
  if (stale === false) return <span className="text-xs text-slate-400">Current</span>;
  return <span className="text-xs text-slate-500">Unknown</span>;
}

/** Item text with `code` and [links](https://...) rendered; everything else stays plain text. */
export function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(
        <code key={m.index} className="rounded bg-slate-800 px-1 text-[0.85em]">
          {m[1]}
        </code>,
      );
    } else {
      parts.push(
        <a key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer" className={LINK}>
          {m[2]}
          <span className="sr-only"> (opens in new tab)</span>
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Red card listing a file's frontmatter errors, or why GitHub could not be read. */
export function ErrorCard({ app }: { app: AppRoadmap }) {
  const errors =
    app.state === "invalid" ? (app.roadmap?.errors ?? []) : app.state === "error" && app.error ? [app.error] : [];
  if (errors.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-800 bg-red-950/40 p-4">
      <p className="font-semibold text-red-200">
        {app.state === "invalid" ? `${app.app.name}: the roadmap file has errors` : `${app.app.name}: could not read from GitHub`}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-100">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
