"use client";

import { useTransition } from "react";
import { publishEpisodeAction } from "../actions";

export function PublishButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(
            "Publish this episode? Slice C will fire outbox drafts on publish; until then this just sets status=published."
          )
        ) {
          start(() => publishEpisodeAction(id));
        }
      }}
      className="inline-flex items-center min-h-11 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60 shrink-0"
    >
      {pending ? "Publishing…" : "Publish"}
    </button>
  );
}
