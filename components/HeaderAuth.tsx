"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const linkClass =
  "inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded";

/**
 * Header auth control. Three states:
 *
 *   loading       → render the Apps link only (no flicker for unauthenticated
 *                   visitors, who are the majority).
 *   unauthenticated → "Apps" → /account (the ecosystem sign-in hub).
 *   authenticated → "Apps" → /account AND a "Sign out" button.
 *
 * "Apps" intentionally replaces the older "Sign in" label so signed-in users
 * don't see a misleading prompt to authenticate again. The link still goes
 * to /account because that's the canonical ecosystem hub for both audiences.
 */
export function HeaderAuth() {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <>
      <Link href="/account" className={linkClass}>
        Apps
      </Link>
      {authenticated ? (
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className={linkClass}
        >
          Sign out
        </button>
      ) : null}
    </>
  );
}
