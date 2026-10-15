"use client";

import { useActionState } from "react";
import { CONFIRM_PHRASE, runCleanupAction, type CleanupActionState } from "./actions";

const initial: CleanupActionState = { ok: true, message: "", lines: [] };

export function CleanupForm({ disabled, count }: { disabled: boolean; count: number }) {
  const [state, action, pending] = useActionState(runCleanupAction, initial);
  return (
    <form action={action} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm">
        This deletes <strong>{count}</strong> item(s) listed above: every Vercel preview deployment and every Neon
        branch named <code>preview/*</code>. Production deployments and default or protected branches are never
        touched. Deleting a branch&apos;s last preview deployment also makes Neon remove that branch.
      </p>
      <label className="block text-sm">
        Type <code>{CONFIRM_PHRASE}</code> to confirm
        <input
          name="confirm"
          autoComplete="off"
          className="mt-1 block w-full rounded border px-2 py-1 font-mono"
          disabled={disabled || pending}
        />
      </label>
      <button
        type="submit"
        disabled={disabled || pending || count === 0}
        className="rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete all preview deployments and branches"}
      </button>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-green-800" : "text-red-800"}`} role="status">
          {state.message}
        </p>
      ) : null}
      {state.lines.length ? (
        <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-xs">{state.lines.join("\n")}</pre>
      ) : null}
    </form>
  );
}
