"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  previewImportAction,
  commitImportAction,
  type PreviewState,
  type CommitState,
} from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";
const labelClass = "text-sm font-semibold text-slate-100";
const primaryBtn =
  "inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg border border-slate-700 text-slate-100 hover:border-teal-400 hover:text-teal-300 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60";

const SHOW_LABEL: Record<"wfc" | "aamsaz", string> = {
  wfc: "World's Fastest Centenarian",
  aamsaz: "African American Museum of Southern Arizona",
};

const initialPreview: PreviewState = { status: "idle" };
const initialCommit: CommitState = { status: "idle" };

export function ImportFlow({
  defaultWfcFeed,
  defaultAamsazFeed,
}: {
  defaultWfcFeed: string;
  defaultAamsazFeed: string;
}) {
  const [show, setShow] = useState<"wfc" | "aamsaz">("wfc");
  const [feedUrl, setFeedUrl] = useState<string>(defaultWfcFeed);
  const [previewState, previewAction] = useActionState<PreviewState, FormData>(
    previewImportAction,
    initialPreview
  );
  const [commitState, commitAction] = useActionState<CommitState, FormData>(
    commitImportAction,
    initialCommit
  );

  function onShowChange(next: "wfc" | "aamsaz") {
    setShow(next);
    setFeedUrl(next === "wfc" ? defaultWfcFeed : defaultAamsazFeed);
  }

  return (
    <div className="mt-8 space-y-8">
      <form action={previewAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <label htmlFor="show" className={labelClass}>
              Show
            </label>
            <select
              id="show"
              name="show"
              value={show}
              onChange={(e) => onShowChange(e.target.value as "wfc" | "aamsaz")}
              className={inputClass}
            >
              <option value="wfc">{SHOW_LABEL.wfc}</option>
              <option value="aamsaz">{SHOW_LABEL.aamsaz}</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="feedUrl" className={labelClass}>
              Disctopia RSS feed URL
            </label>
            <input
              id="feedUrl"
              name="feedUrl"
              type="url"
              required
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <PreviewSubmit />

        {previewState.status === "error" ? (
          <p role="alert" className="text-sm text-red-400">
            {previewState.error}
          </p>
        ) : null}
      </form>

      {previewState.status === "ready" ? (
        <PreviewPanel
          state={previewState}
          commitAction={commitAction}
          commitState={commitState}
        />
      ) : null}
    </div>
  );
}

function PreviewSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryBtn}>
      {pending ? "Fetching feed…" : "Preview feed"}
    </button>
  );
}

function PreviewPanel({
  state,
  commitAction,
  commitState,
}: {
  state: Extract<PreviewState, { status: "ready" }>;
  commitAction: (payload: FormData) => void;
  commitState: CommitState;
}) {
  const insertable = state.items.filter(
    (i) => i.willInsert && i.hasHttpsArtwork
  ).length;
  const blocked = state.items.filter(
    (i) => i.willInsert && !i.hasHttpsArtwork
  ).length;

  return (
    <section
      aria-labelledby="preview-heading"
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-5"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="preview-heading"
          className="text-lg font-semibold text-slate-100"
        >
          Preview — {SHOW_LABEL[state.show]}
        </h2>
        <p className="text-xs text-slate-500">{state.channelTitle}</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Items in feed" value={state.items.length} />
        <Stat label="New" value={state.newCount} accent />
        <Stat label="Already imported" value={state.skipCount} muted />
        <Stat
          label="Blocked (non-https art)"
          value={blocked}
          warn={blocked > 0}
        />
      </div>

      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {state.items.map((item) => (
          <li
            key={item.guid}
            className="flex items-start gap-3 px-4 py-3 text-sm"
          >
            <span className="font-mono text-xs text-slate-500 w-12 shrink-0 pt-0.5">
              {item.itunesEpisode != null ? `#${item.itunesEpisode}` : "—"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-slate-100">{item.title}</p>
              <p className="text-xs text-slate-500">
                {item.pubDate
                  ? new Date(item.pubDate).toISOString().slice(0, 10)
                  : "no pubDate"}{" "}
                · guid {item.guid.slice(0, 8)}…
                {!item.hasHttpsArtwork && item.hasArtwork ? (
                  <span className="text-red-400"> · non-https artwork</span>
                ) : null}
                {!item.hasArtwork ? (
                  <span className="text-red-400"> · no artwork</span>
                ) : null}
              </p>
            </div>
            <ImportStatus item={item} />
          </li>
        ))}
      </ul>

      {state.warnings.length > 0 ? (
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer">
            {state.warnings.length} warning(s)
          </summary>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {state.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <form action={commitAction} className="flex items-center gap-3">
        <input type="hidden" name="show" value={state.show} />
        <input type="hidden" name="feedUrl" value={state.feedUrl} />
        <CommitSubmit insertable={insertable} />
      </form>

      {commitState.status === "error" ? (
        <p role="alert" className="text-sm text-red-400">
          {commitState.error}
        </p>
      ) : null}
      {commitState.status === "done" ? (
        <p
          role="status"
          className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200"
        >
          Imported {commitState.inserted} new episode(s) as drafts; skipped{" "}
          {commitState.skipped} already in the DB.
          {commitState.failedGuids.length > 0 ? (
            <span className="block text-xs text-red-300">
              {commitState.failedGuids.length} insert(s) failed —{" "}
              <a
                href="/admin/episodes"
                className="underline underline-offset-2"
              >
                back to list
              </a>
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

function ImportStatus({
  item,
}: {
  item: { willInsert: boolean; hasHttpsArtwork: boolean };
}) {
  if (!item.willInsert) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-xs text-slate-400">
        already imported
      </span>
    );
  }
  if (!item.hasHttpsArtwork) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
        skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs text-teal-300">
      will import
    </span>
  );
}

function CommitSubmit({ insertable }: { insertable: number }) {
  const { pending } = useFormStatus();
  const disabled = pending || insertable === 0;
  return (
    <button type="submit" disabled={disabled} className={primaryBtn}>
      {pending
        ? "Importing…"
        : insertable === 0
          ? "Nothing to import"
          : `Import ${insertable} episode(s) as drafts`}
    </button>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
  warn?: boolean;
}) {
  const tone = warn
    ? "border-red-500/30 bg-red-500/5 text-red-200"
    : accent
      ? "border-teal-500/30 bg-teal-500/5 text-teal-200"
      : muted
        ? "border-slate-800 bg-slate-900/40 text-slate-400"
        : "border-slate-800 bg-slate-900/40 text-slate-200";
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
