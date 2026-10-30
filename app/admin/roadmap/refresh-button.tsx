"use client";

import { useActionState } from "react";
import { refreshRoadmapAction, type RefreshResult } from "./actions";

const INITIAL: RefreshResult = null;

/** "Refresh now": skips the one-hour cache and reads every roadmap from GitHub again. */
export function RefreshButton() {
  const [result, action, isPending] = useActionState(refreshRoadmapAction, INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
      >
        {isPending ? "Refreshing…" : "Refresh now"}
      </button>
      {result?.ok === false ? (
        <span role="alert" className="text-sm text-red-300">
          {result.error}
        </span>
      ) : (
        <span role="status" aria-live="polite" className="text-sm text-slate-300">
          {result?.ok ? `Read from GitHub at ${result.data.refreshedAt.slice(11, 16)} UTC.` : ""}
        </span>
      )}
    </form>
  );
}
