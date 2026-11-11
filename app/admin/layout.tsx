import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { betterAuthUrl } from "@/lib/identity/env";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { witusEndSessionUrl } from "@/lib/identity/end-session";
import { SignOutButton } from "./SignOutButton";
import { SignOutEverywhereButton } from "./SignOutEverywhereButton";

export const dynamic = "force-dynamic";

/**
 * "Sign out of WitUS everywhere", behind its own Suspense boundary so the IdP discovery read (cached
 * an hour, up to a 2 s timeout on a miss) never holds back the admin shell. Renders nothing when
 * witus.online is not a configured "Sign in with WitUS" client (task 128 (b)).
 */
async function EndSessionControl() {
  const endSessionUrl = await witusEndSessionUrl();
  return <SignOutEverywhereButton endSessionUrl={endSessionUrl} />;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }
  // Plain "Sign out" ends only this site's session; EndSessionControl also ends the WitUS session.
  if (!isAdminEmail(session.user.email)) {
    return (
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-10"
      >
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            403 — not authorized
          </h1>
          <p className="text-sm text-slate-400">
            Signed in as <span className="font-mono">{session.user.email}</span>
            , which is not the admin account.
          </p>
          <div className="flex flex-col items-center gap-2 pt-2">
            <SignOutButton />
            <Suspense fallback={null}>
              <EndSessionControl />
            </Suspense>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="border-b border-slate-800 bg-slate-950/50">
        {/* Wraps instead of scrolling sideways: BAM opens the admin on his phone (320px rule). */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center font-semibold text-slate-100 hover:text-teal-300"
            >
              witus.online admin
            </Link>
            <Link
              href="/admin/tasks"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Tasks
            </Link>
            <Link
              href="/admin/dora"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              DORA
            </Link>
            <Link
              href="/admin/episodes"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Episodes
            </Link>
            <Link
              href="/admin/invitations"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Invitations
            </Link>
            <Link
              href="/admin/library"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Library
            </Link>
            <Link
              href="/admin/roadmap"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Roadmap
            </Link>
            <Link
              href="/admin/cost-cleanup"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Cost cleanup
            </Link>
            <Link
              href="/admin/costs"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Costs
            </Link>
            <Link
              href="/admin/usage"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              Usage
            </Link>
            <a
              href={`${betterAuthUrl()}/account`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-slate-300 hover:text-teal-300"
            >
              WitUS Accounts ↗
            </a>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <span className="min-h-9 inline-flex min-w-0 items-center break-all text-xs text-slate-500">
              {session.user.email}
            </span>
            {/* WitUS sign-ins live on the IdP host, so this opens accounts.witus.online. */}
            <a
              href={`${betterAuthUrl()}/accounts/devices`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-9 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-teal-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              Your devices ↗<span className="sr-only"> (opens in new tab)</span>
            </a>
            <SignOutButton />
            <Suspense fallback={null}>
              <EndSessionControl />
            </Suspense>
          </div>
        </div>
      </nav>
      {/* Side gutters for every admin page (BAM, 2026-11-09: "more space between the sides of the
          page content and the edges"). Pages keep their own px-4, so content sits 24px from the edge
          on phones (the 16px floor in docs/shared-ui-ux-dx.md), 32px from sm and 48px from lg. */}
      <div className="flex min-w-0 flex-1 flex-col px-2 sm:px-4 lg:px-8">{children}</div>
    </div>
  );
}
