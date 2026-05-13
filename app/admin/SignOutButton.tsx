"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center min-h-9 px-3 py-1.5 rounded-md border border-slate-700 hover:border-teal-400 hover:text-teal-300 text-xs font-semibold text-slate-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
    >
      Sign out
    </button>
  );
}
