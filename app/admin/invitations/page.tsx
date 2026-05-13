import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { invitations, users } from "@/db/schema";
import { InviteForm } from "./InviteForm";
import { RevokeButton } from "./RevokeButton";

export const dynamic = "force-dynamic";

type State = "pending" | "accepted" | "expired" | "revoked";

function classifyState(row: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): State {
  if (row.revokedAt) return "revoked";
  if (row.acceptedAt) return "accepted";
  if (row.expiresAt < new Date()) return "expired";
  return "pending";
}

const stateStyles: Record<State, string> = {
  pending: "bg-teal-500/10 text-teal-300 border-teal-500/30",
  accepted: "bg-slate-700/30 text-slate-200 border-slate-600/40",
  expired: "bg-slate-800/50 text-slate-400 border-slate-700",
  revoked: "bg-red-500/10 text-red-300 border-red-500/30",
};

export default async function InvitationsPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      revokedAt: invitations.revokedAt,
      createdAt: invitations.createdAt,
      invitedByEmail: users.email,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.invitedBy, users.id))
    .orderBy(desc(invitations.createdAt));

  return (
    <main id="main" className="mx-auto max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/admin"
        className="text-xs text-slate-500 hover:text-teal-300"
      >
        ← Admin
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
        Invitations
      </h1>
      <p className="mt-2 max-w-prose text-sm text-slate-400">
        Anyone you invite here can sign in at <code>/auth/sign-in</code> using
        their email + a magic link. Without an active invitation, sign-in is
        rejected. Admin (you) can always sign in regardless. Note: invited
        users can authenticate, but the <code>/admin/*</code> area remains
        admin-only for now.
      </p>

      <section className="mt-8">
        <InviteForm />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          All invitations ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            No invitations yet. Invite someone above to grant them sign-in.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {rows.map((row) => {
              const state = classifyState(row);
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-slate-100 font-mono">
                      {row.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      Invited {row.createdAt.toISOString().slice(0, 10)}
                      {row.invitedByEmail ? ` by ${row.invitedByEmail}` : ""}
                      {state === "pending" || state === "expired"
                        ? ` · expires ${row.expiresAt.toISOString().slice(0, 10)}`
                        : null}
                      {state === "accepted" && row.acceptedAt
                        ? ` · accepted ${row.acceptedAt.toISOString().slice(0, 10)}`
                        : null}
                      {state === "revoked" && row.revokedAt
                        ? ` · revoked ${row.revokedAt.toISOString().slice(0, 10)}`
                        : null}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${stateStyles[state]}`}
                  >
                    {state}
                  </span>
                  {state === "pending" || state === "accepted" ? (
                    <RevokeButton id={row.id} email={row.email} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
