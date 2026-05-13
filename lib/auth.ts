import "server-only";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  invitations,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { getEnv } from "@/lib/env";

const env = getEnv();
const adminEmail = env.ADMIN_EMAIL.toLowerCase();

/**
 * Look up a non-revoked, non-expired invitation matching the given email.
 * Returns the invitation row id when present (caller stamps acceptedAt on
 * first successful sign-in).
 */
async function findActiveInvitationId(email: string): Promise<string | null> {
  const db = getDb();
  const row = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, email),
      isNull(invitations.revokedAt),
      gt(invitations.expiresAt, new Date())
    ),
    columns: { id: true, acceptedAt: true },
  });
  if (!row) return null;
  // Stamp acceptedAt on first sign-in so the admin UI can show pending vs.
  // accepted state. Idempotent on subsequent sign-ins.
  if (!row.acceptedAt) {
    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, row.id));
  }
  return row.id;
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    EmailProvider({
      server: env.EMAIL_SERVER,
      from: env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      if (email === adminEmail) return true;
      const inviteId = await findActiveInvitationId(email);
      if (inviteId) return true;
      console.warn("[auth] rejected sign-in for non-invited email");
      return false;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        if (token.sub) {
          (session.user as { id?: string }).id = token.sub;
        }
      }
      return session;
    },
  },
};
