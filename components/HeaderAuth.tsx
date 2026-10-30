"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const linkClass =
  "inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded";

/**
 * Header auth control. Two states, and the sign-in control is always present for a visitor who
 * is not signed in:
 *
 *   not authenticated (also while the session is still loading)
 *       → "Apps" → /account (the ecosystem hub) AND "Sign in" → /auth/sign-in
 *   authenticated
 *       → "Apps" → /account, "Admin" → /admin AND a "Sign out" button (Admin added 2026-10-21:
 *         BAM had no way to reach the dashboard from the site)
 *
 * Rule (docs/shared-ui-ux-dx.md, "Sign-in control"): a public header always shows "Sign in" to a
 * visitor who is not signed in. On 2026-05-13 this control was renamed to "Apps" only, and BAM
 * reported witus.online as having no login button (2026-10-16, "this has happened before"). The
 * accessible name "Sign in" is asserted by e2e/header-auth.spec.ts on every preview and production
 * deployment, so renaming or removing it fails CI. Showing "Sign in" during the loading state means
 * a signed-in visitor may see it for a moment before "Sign out" replaces it; that beats hiding the
 * control from the majority, who are not signed in.
 *
 * "Sign out" here ends only the witus.online session, never the WitUS session at
 * accounts.witus.online (BAM, 2026-10-29, witus task 128 option (b)). The separate
 * "Sign out of WitUS everywhere" control lives in the admin bar (app/admin/layout.tsx).
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
        <>
          <Link href="/admin" className={linkClass}>
            Admin
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={linkClass}
          >
            Sign out
          </button>
        </>
      ) : (
        <Link href="/auth/sign-in" className={linkClass}>
          Sign in
        </Link>
      )}
    </>
  );
}
