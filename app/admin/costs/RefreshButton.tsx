"use client";

import { useActionState } from "react";
import { refreshCostsAction, type RefreshState } from "./actions";

export function RefreshButton() {
  const [state, action, pending] = useActionState(refreshCostsAction, { ok: true, message: "" });
  return (
    <form action={action} className="flex items-center gap-3">
      <button type="submit" disabled={pending} className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {pending ? "Collecting…" : "Refresh now"}
      </button>
      {state.message ? <span className={`text-sm ${state.ok ? "text-green-800" : "text-red-800"}`} role="status">{state.message}</span> : null}
    </form>
  );
}
