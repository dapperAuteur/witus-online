import { neon } from "@neondatabase/serverless";

/**
 * Liveness endpoint for uptime monitoring (Better Stack).
 *
 * WHY THIS EXISTS
 * The uptime monitors used to point at `/`, which is a statically prerendered marketing page. It
 * answers 200 from the CDN whether or not the database is reachable, so a green check meant only
 * "Vercel is up". This route actually touches the critical dependency, so a green check means the
 * app can serve real data.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * 1. It never echoes the underlying error. `STORAGE_DATABASE_URL` is a `postgres://` URI with the
 *    password INLINE, and a connection failure puts it verbatim in the error message (the same
 *    hazard `lib/sentry-scrub.ts` exists to contain). This route is public and unauthenticated, so
 *    every failure collapses to one fixed token: `database_unreachable`. No message, no stack, no
 *    host, no cause. That is also why the failure path logs a constant string rather than the
 *    error object: a credential in the deploy log is a credential in a second place.
 * 2. It reports nothing an attacker could inventory: no version, no commit, no env values, no row
 *    counts, no which-dependency-failed breakdown beyond the single database check.
 * 3. It does NOT go through `getEnv()` / `getDb()`. `lib/env.ts` validates the whole env at once and
 *    throws if `NEXTAUTH_SECRET`, `EMAIL_SERVER`, `EMAIL_FROM`, or `ADMIN_EMAIL` are missing, which
 *    would make this endpoint report "unhealthy" for a mail-config gap that has nothing to do with
 *    whether the app and database are alive. It reads the connection string directly instead,
 *    accepting both names the Vercel-Neon integrations use, exactly as `lib/env.ts` normalizes them.
 */

// Never cached, at any layer. A cached health check is the failure this endpoint exists to prevent.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** Hard ceiling on the whole check, so a hung database returns 503 fast instead of holding the
 *  monitor open until its own timeout fires and reports an ambiguous "request timed out". */
const TIMEOUT_MS = 4000;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
} as const;

/** The ONLY failure detail that ever reaches the client. */
const GENERIC_ERROR = "database_unreachable";

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("health check timed out")), ms);
  });
  return Promise.race([work, limit]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Cheapest possible liveness query. Proves the connection string resolves, the endpoint accepts
 *  us, and the database answers, without reading a single row of application data. */
async function pingDatabase(): Promise<void> {
  const url = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("no database url configured");

  const sql = neon(url, {
    fetchOptions: {
      cache: "no-store",
      // Belt to the Promise.race braces: aborts the socket rather than leaving it dangling.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  await withTimeout(sql`SELECT 1`, TIMEOUT_MS);
}

/** True when the dependency answered, false for every possible failure. Swallows the error on
 *  purpose: nothing about it is safe to surface or to log. */
async function isHealthy(): Promise<boolean> {
  try {
    await pingDatabase();
    return true;
  } catch {
    console.error("[health] database liveness check failed");
    return false;
  }
}

export async function GET(): Promise<Response> {
  const ok = await isHealthy();

  const body = ok
    ? { ok: true, checks: { database: "ok" }, time: new Date().toISOString() }
    : { ok: false, error: GENERIC_ERROR, time: new Date().toISOString() };

  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 503,
    headers: HEADERS,
  });
}

/** Monitors that probe with HEAD get the same status code and the same guarantees, no body. */
export async function HEAD(): Promise<Response> {
  const ok = await isHealthy();
  return new Response(null, { status: ok ? 200 : 503, headers: HEADERS });
}
