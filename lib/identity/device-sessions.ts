import "server-only";
import { and, desc, eq, gt, max } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "./auth";
import { getIdentityDb } from "./db";
import { ECOSYSTEM_APPS, clientIdFor } from "./clients";
import { findOwnedSession } from "./devices.mjs";
import { oauthAccessToken, oauthApplication, session } from "@/db/identity-schema";

/**
 * Data for the "Your devices" page (app/accounts/devices).
 *
 * WHY THIS READS THE SESSION TABLE INSTEAD OF CALLING better-auth's listSessions. Verified in
 * better-auth 1.6.23 (dist/api/routes/session.mjs): `/list-sessions` runs
 * `freshSessionMiddleware`, which answers 403 SESSION_NOT_FRESH once the CURRENT session's
 * createdAt is older than `session.freshAge` (default 1 day, dist/context/create-context.mjs).
 * Renewal moves expiresAt, not createdAt, so the page would fail for anyone signed in for more
 * than a day. It also returns every session's `token`. Reading the table ourselves keeps tokens on
 * the server and works at any session age. Revoking still goes through better-auth
 * (`revokeSession`, `revokeOtherSessions`), which use the authoritative-session check only.
 */

/** A signed-in device as the page sees it. No token: tokens never leave the server. */
export type DeviceRow = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
};

export type ConnectedApp = {
  clientId: string;
  name: string;
  lastIssuedAt: Date;
};

/** The signed-in WitUS user and session id for this request, or null. */
export async function currentIdentitySession(): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.session || !result.user) return null;
  return { userId: result.user.id, sessionId: result.session.id };
}

/** Unexpired sessions for `userId`, most recently renewed first, with the current one marked. */
export async function listDevices(userId: string, currentSessionId: string): Promise<DeviceRow[]> {
  const rows = await getIdentityDb()
    .select({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      city: session.city,
      region: session.region,
      country: session.country,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt));
  return rows
    .map((r) => ({ ...r, isCurrent: r.id === currentSessionId }))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
}

/**
 * The session's token, looked up by id AND owner. Used only to hand the token to better-auth's
 * revokeSession on the server; never returned to the browser.
 */
export async function ownedSessionToken(
  userId: string,
  sessionId: string,
): Promise<{ id: string; userId: string; token: string } | null> {
  const rows = await getIdentityDb()
    .select({ id: session.id, userId: session.userId, token: session.token })
    .from(session)
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
    .limit(1);
  // The WHERE clause already scopes to the owner; this is the unit-tested check, kept as a second
  // gate so a future edit to the query can't silently drop the owner condition.
  return findOwnedSession(rows, sessionId, userId);
}

const APP_NAMES = new Map(ECOSYSTEM_APPS.map((app) => [clientIdFor(app.slug), app.name]));

/**
 * WitUS apps that have issued tokens to this user, newest first, from oauth_access_token. Names
 * come from the client registry (lib/identity/clients.ts), then the DB client table for any
 * dynamically registered client, then the raw client id.
 */
export async function listConnectedApps(userId: string): Promise<ConnectedApp[]> {
  const db = getIdentityDb();
  const lastIssued = max(oauthAccessToken.createdAt);
  const rows = await db
    .select({ clientId: oauthAccessToken.clientId, lastIssuedAt: lastIssued })
    .from(oauthAccessToken)
    .where(eq(oauthAccessToken.userId, userId))
    .groupBy(oauthAccessToken.clientId)
    .orderBy(desc(lastIssued));

  const unknownIds = rows.map((r) => r.clientId).filter((id) => !APP_NAMES.has(id));
  const dbNames = new Map<string, string>();
  for (const clientId of unknownIds) {
    const found = await db
      .select({ name: oauthApplication.name })
      .from(oauthApplication)
      .where(eq(oauthApplication.clientId, clientId))
      .limit(1);
    if (found[0]?.name) dbNames.set(clientId, found[0].name);
  }

  return rows
    .filter((r): r is { clientId: string; lastIssuedAt: Date } => r.lastIssuedAt instanceof Date)
    .map((r) => ({
      clientId: r.clientId,
      name: APP_NAMES.get(r.clientId) ?? dbNames.get(r.clientId) ?? r.clientId,
      lastIssuedAt: r.lastIssuedAt,
    }));
}
