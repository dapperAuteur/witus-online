"use client";

import { useActionState, useState } from "react";
import { markTaskDoneAction, undoTaskDoneAction, type TaskActionResult } from "./actions";

export type TaskItemData = {
  key: string;
  number: string | null;
  title: string;
  tier: number;
  tierLabel: string;
  /** Short plain-text previews of the index cells; the full cells load with the body. */
  blocksPreview: string;
  statusPreview: string;
  file: string | null;
  repoPath: string;
  hasBody: boolean;
  bodyWithheld: string | null;
  doneAt: string | null;
  doneBy: string | null;
};

type BodyState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; html: string | null; cells: { scope: string; blocks: string; status: string } }
  | { state: "error"; message: string };

const TIER_STYLE = [
  "border-red-700 bg-red-950/70 text-red-200", // Security
  "border-orange-700 bg-orange-950/70 text-orange-200", // Broken
  "border-amber-700 bg-amber-950/60 text-amber-200", // Launch or deadline
  "border-teal-800 bg-teal-950/60 text-teal-200", // Blocking
  "border-slate-700 bg-slate-900 text-slate-300", // Open
  "border-slate-800 bg-slate-950 text-slate-400", // Later
];

const focusRing = "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

export function TierBadge({ tier, label }: { tier: number; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${TIER_STYLE[tier] ?? TIER_STYLE[4]}`}>
      {label}
    </span>
  );
}

const INITIAL: TaskActionResult = null;

/** The full index cells (owner-authored markdown rendered on the server by /admin/tasks/body). */
function IndexCells({ cells }: { cells: { scope: string; blocks: string; status: string } }) {
  const rows = [
    ["Blocks", cells.blocks],
    ["Status", cells.status],
    ["Scope", cells.scope],
  ].filter(([, html]) => html);
  if (rows.length === 0) return null;
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, html]) => (
        <div key={label}>
          <dt className="font-semibold text-slate-400">{label}</dt>
          <dd
            className="break-words text-slate-200 [&_a]:text-teal-300 [&_code]:text-xs [&_code]:text-slate-100"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ))}
    </dl>
  );
}

function ToggleDoneForm({ taskKey, done }: { taskKey: string; done: boolean }) {
  const [result, action, isPending] = useActionState(done ? undoTaskDoneAction : markTaskDoneAction, INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="key" value={taskKey} />
      <button
        type="submit"
        disabled={isPending}
        className={
          done
            ? `min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:border-teal-400 disabled:opacity-50 ${focusRing}`
            : `min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50 ${focusRing}`
        }
      >
        {isPending ? "Saving…" : done ? "Undo" : "Mark done"}
      </button>
      {result?.ok === false ? (
        <span role="alert" className="text-sm text-red-300">
          {result.error}
        </span>
      ) : (
        <span role="status" aria-live="polite" className="text-sm text-slate-300">
          {result?.ok ? (done ? "Done mark cleared." : "Marked done. The next local sync moves the file.") : ""}
        </span>
      )}
    </form>
  );
}

/**
 * One task: a native <details> row (keyboard and screen-reader support for free). The body and the
 * full index cells load from /admin/tasks/body the first time the row opens, so the page itself
 * stays small on a phone.
 */
export function TaskItem({ task, showStatus = true }: { task: TaskItemData; showStatus?: boolean }) {
  const [body, setBody] = useState<BodyState>({ state: "idle" });
  // The expanded part renders only after the first open: ~1,000 rows of hidden markup would
  // otherwise double the page a phone has to download and lay out.
  const [opened, setOpened] = useState(false);
  const path = `${task.repoPath}/plans/user-tasks/${task.file ?? "00-descriptions.md"}`;

  async function loadBody() {
    if (body.state === "loading" || body.state === "ready") return;
    setBody({ state: "loading" });
    try {
      const res = await fetch(`/admin/tasks/body?key=${encodeURIComponent(task.key)}`, { cache: "no-store" });
      const json = (await res.json()) as
        | { ok: true; data: { html: string | null; cells: { scope: string; blocks: string; status: string } } }
        | { ok: false; error: string };
      if (!json.ok) setBody({ state: "error", message: json.error });
      else setBody({ state: "ready", html: json.data.html, cells: json.data.cells });
    } catch {
      setBody({ state: "error", message: "Could not load the task. Check the connection and open it again." });
    }
  }

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/40">
      <details
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) {
            setOpened(true);
            void loadBody();
          }
        }}
      >
        <summary className={`flex min-h-11 cursor-pointer list-none flex-col gap-1 rounded-lg px-3 py-3 [&::-webkit-details-marker]:hidden ${focusRing}`}>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <TierBadge tier={task.tier} label={task.tierLabel} />
            {task.number ? <span className="font-mono text-xs text-slate-400">#{task.number}</span> : null}
            <span className="min-w-0 break-words font-semibold text-slate-100">{task.title}</span>
          </span>
          {task.blocksPreview ? (
            <span className="break-words text-sm text-slate-300">
              <span className="font-semibold text-slate-400">Blocks: </span>
              {task.blocksPreview}
            </span>
          ) : null}
          {showStatus && task.statusPreview ? (
            <span className="break-words text-sm text-slate-400">
              <span className="font-semibold">Status: </span>
              {task.statusPreview}
            </span>
          ) : null}
        </summary>
        {opened ? (
          <div className="space-y-4 border-t border-slate-800 px-3 py-4">
            {body.state === "ready" ? <IndexCells cells={body.cells} /> : null}
            {task.bodyWithheld ? (
              <p role="note" className="rounded-md border border-amber-700 bg-amber-950/50 px-3 py-2 text-sm text-amber-100">
                The file was not uploaded because it matched a {task.bodyWithheld}. Move the value into an
                env file, then run the sync again. Read it on the laptop at{" "}
                <span className="break-all font-mono text-xs">{path}</span>.
              </p>
            ) : body.state === "loading" || body.state === "idle" ? (
              <p role="status" className="text-sm text-slate-400">
                Loading the task…
              </p>
            ) : body.state === "error" ? (
              <p role="alert" className="text-sm text-red-300">
                {body.message}
              </p>
            ) : body.html ? (
              <article
                className="prose prose-invert prose-slate prose-sm max-w-none break-words prose-headings:tracking-tight prose-a:text-teal-300 prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: body.html }}
              />
            ) : (
              <p className="text-sm text-slate-400">No task file for this index row; the index text above is all there is.</p>
            )}
            <p className="break-all font-mono text-xs text-slate-500">{path}</p>
            {task.doneAt ? (
              <p className="text-sm text-slate-300">
                Marked done {task.doneAt.slice(0, 16).replace("T", " ")} UTC{task.doneBy ? ` by ${task.doneBy}` : ""}. The next
                local sync lists it so the file moves to completed/.
              </p>
            ) : null}
            <ToggleDoneForm taskKey={task.key} done={Boolean(task.doneAt)} />
          </div>
        ) : null}
      </details>
    </li>
  );
}
