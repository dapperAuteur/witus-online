"use client";

import { useId, useState } from "react";
import { signOut } from "next-auth/react";
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  signOutEverywhere,
} from "@/lib/identity/sign-out-everywhere.mjs";

/**
 * "Sign out of WitUS everywhere" (BAM, 2026-10-29, witus task 128 option (b)). Secondary to the
 * plain "Sign out" beside it, never a replacement. Ends the witus.online session, then ends the
 * WitUS session at accounts.witus.online. Renders nothing when `endSessionUrl` is null (this deploy
 * is not a configured WitUS client). The URL is resolved on the server (lib/identity/end-session.ts).
 */
export function SignOutEverywhereButton({ endSessionUrl }: { endSessionUrl: string | null }) {
  const helpId = useId();
  const [pending, setPending] = useState(false);
  if (!endSessionUrl) return null;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        aria-describedby={helpId}
        onClick={() => {
          setPending(true);
          void signOutEverywhere({
            signOutLocal: () => signOut({ redirect: false }),
            navigate: (url) => window.location.assign(url),
            endSessionUrl,
            origin: window.location.origin,
          });
        }}
        className="inline-flex items-center min-h-9 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-400 underline-offset-2 hover:underline hover:text-teal-300 disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
      >
        {SIGN_OUT_EVERYWHERE_LABEL}
      </button>
      <span id={helpId} className="max-w-xs text-[11px] leading-snug text-slate-500">
        {SIGN_OUT_EVERYWHERE_HELP}
      </span>
    </span>
  );
}
