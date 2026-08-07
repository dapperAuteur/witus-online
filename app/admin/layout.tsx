import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }
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
            Signed in as{" "}
            <span className="font-mono">{session.user.email}</span>, which is
            not the admin account.
          </p>
          <div className="pt-2">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="border-b border-slate-800 bg-slate-950/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/admin"
              className="font-semibold text-slate-100 hover:text-teal-300"
            >
              witus.online admin
            </Link>
            <Link
              href="/admin/episodes"
              className="text-slate-300 hover:text-teal-300"
            >
              Episodes
            </Link>
            <Link
              href="/admin/invitations"
              className="text-slate-300 hover:text-teal-300"
            >
              Invitations
            </Link>
            <Link
              href="/admin/library"
              className="text-slate-300 hover:text-teal-300"
            >
              Library
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
