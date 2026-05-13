"use client";

import { useTransition } from "react";
import { revokeInvitationAction } from "./actions";

export function RevokeButton({ id, email }: { id: string; email: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Revoke invitation for ${email}?`)) {
          start(() => revokeInvitationAction(id));
        }
      }}
      className="inline-flex items-center min-h-9 px-3 py-1.5 rounded-md border border-red-500/30 text-red-300 hover:border-red-400 hover:text-red-200 text-xs font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-wait disabled:opacity-60 shrink-0"
    >
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}
