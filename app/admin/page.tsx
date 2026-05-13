import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }
  return (
    <main
      id="main"
      className="flex flex-1 items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Admin
        </h1>
        <p className="text-sm text-slate-400">
          Signed in as <span className="font-mono">{session.user.email}</span>.
        </p>
        <p className="text-xs text-slate-500">
          Episode admin lands in Slice B.
        </p>
      </div>
    </main>
  );
}
