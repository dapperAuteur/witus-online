"use client";

import { useActionState, useMemo, useState } from "react";
import { deleteSelectedAction, type CleanupActionState } from "./actions";

export interface Row {
  id: string;
  label: string;
  detail: string;
  created: string;
}
export interface Group {
  key: string;
  tool: "vercel" | "neon";
  project: string;
  rows: Row[];
}

const initial: CleanupActionState = { ok: true, message: "", lines: [] };

/** Checkbox per row, select-all per project, select-all across everything; deletes only the ticked ids. */
export function CleanupSelector({ groups }: { groups: Group[] }) {
  const allIds = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.id)), [groups]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [state, action, pending] = useActionState(deleteSelectedAction, initial);

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const setMany = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) (on ? next.add(id) : next.delete(id));
      return next;
    });
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));

  return (
    <form action={action} className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={allOn} onChange={(e) => setMany(allIds, e.target.checked)} disabled={pending || allIds.length === 0} />
          Select all across the ecosystem ({allIds.length})
        </label>
        <span className="text-neutral-600">{selected.size} selected</span>
      </div>

      {groups.map((g) => {
        const ids = g.rows.map((r) => r.id);
        const on = ids.length > 0 && ids.every((id) => selected.has(id));
        const some = !on && ids.some((id) => selected.has(id));
        return (
          <section key={g.key} className="rounded-lg border border-neutral-200">
            <header className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={on}
                  ref={(el) => {
                    if (el) el.indeterminate = some;
                  }}
                  onChange={(e) => setMany(ids, e.target.checked)}
                  disabled={pending}
                />
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-xs uppercase">{g.tool}</span>
                {g.project}
              </label>
              <span className="text-xs text-neutral-600">{ids.length} item(s)</span>
            </header>
            <ul className="divide-y divide-neutral-100 text-sm">
              {g.rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-1.5">
                  <input type="checkbox" name="ids" value={r.id} checked={selected.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} disabled={pending} />
                  <span className="font-mono text-xs">{r.label}</span>
                  <span className="text-neutral-600">{r.detail}</span>
                  <span className="ml-auto text-xs text-neutral-500">{r.created}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirm" disabled={pending || selected.size === 0} />
          Delete the {selected.size} selected item(s). Production deployments and default or protected branches are never
          listed here, so they cannot be selected.
        </label>
        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Deleting…" : `Delete ${selected.size} selected`}
        </button>
        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-green-800" : "text-red-800"}`} role="status">
            {state.message}
          </p>
        ) : null}
        {state.lines.length ? <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-xs">{state.lines.join("\n")}</pre> : null}
      </div>
    </form>
  );
}
