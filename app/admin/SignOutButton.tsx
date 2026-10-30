"use client";

import { signOut } from "next-auth/react";
import { SIGN_OUT_LABEL } from "@/lib/identity/sign-out-everywhere.mjs";

/**
 * "Sign out" ends ONLY the witus.online session (BAM, 2026-10-29, witus task 128 option (b)).
 * It never goes to the IdP; the WitUS session at accounts.witus.online stays, so the next
 * "Sign in with WitUS" here or in another app goes straight in. Ending the WitUS session is the
 * separate "Sign out of WitUS everywhere" control (SignOutEverywhereButton). The accessible name
 * stays exactly "Sign out" (docs/shared-ui-ux-dx.md, "Sign-in control").
 */
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center min-h-9 px-3 py-1.5 rounded-md border border-slate-700 hover:border-teal-400 hover:text-teal-300 text-xs font-semibold text-slate-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
    >
      {SIGN_OUT_LABEL}
    </button>
  );
}
