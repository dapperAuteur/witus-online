import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/identity/auth";
import { isEcosystemOrigin } from "@/lib/identity/clients";

/**
 * The ecosystem session probe — the endpoint behind "Continue as <name>".
 *
 * An ecosystem app's login page asks this, cross-origin and credentialed, before it makes anyone
 * type an email: "does this browser already have a WitUS session, and what do we call them?" A
 * session answers with a display label; no session answers `{ signedIn: false }`. The app turns a
 * positive answer into a "Continue as <name>" button whose click runs the REAL OIDC code flow.
 *
 * WHY THIS EXISTS INSTEAD OF CORS ON /api/idp/get-session. That is where the clients originally
 * pointed, and it can never be opened up: better-auth's `/get-session` returns the full
 * `{ session, user }`, and `session` carries the SESSION TOKEN. Allowing credentialed CORS on it
 * would let every ecosystem origin — and anything with an XSS foothold on any one of them — read a
 * live IdP session token and impersonate the visitor across the entire ecosystem. Verified against
 * the live IdP on 2026-09-02: `/api/idp/get-session` returns 200 with no
 * `access-control-allow-origin`, so the probe was failing closed in every browser rather than
 * leaking. This endpoint is the fail-open-safely replacement: it reads the same cookie and returns
 * a NAME, never a credential.
 *
 * WHAT IT DELIBERATELY DOES NOT RETURN. No session token, no session id, no expiry, no user id, and
 * no full email address. `label` is the user's name when they have one, otherwise the LOCAL PART of
 * their email — enough for "Continue as brand", not enough to hand another origin an address the
 * visitor has not chosen to share with it. The IdP's own `getAdditionalUserInfoClaim` derives its
 * fallback name the same way, so the label here matches the name the app receives after sign-in.
 *
 * NOTHING HERE AUTHENTICATES ANYONE. The response crosses an origin boundary, so to the receiving
 * app it is client-supplied data by definition. It is display copy for a button. Identity is
 * established only by the OIDC code flow that the button starts.
 */

/** Answers must never be cached: the response is per-cookie and changes on sign-in/sign-out. */
export const dynamic = "force-dynamic";

/**
 * Local dev origins are allowed OUTSIDE PRODUCTION ONLY. No app in the registry registers a
 * localhost redirect URI (redirect URIs are exact-match and adding one would be a new precedent),
 * so without this a developer running an app on :3000 could never exercise the probe against a
 * local IdP. Gated on NODE_ENV so a production deploy can never honour it.
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (isEcosystemOrigin(origin)) return true;
  if (process.env.NODE_ENV === "production" || !origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/**
 * `Vary: Origin` is REQUIRED, not tidiness. The allow-origin header is echoed per caller, so a
 * shared cache without this could hand one app's allow-origin to another app and break its probe.
 * Credentialed CORS also forbids the `*` wildcard, which is why the origin is echoed at all.
 */
function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "accept, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    // 403 with NO CORS headers. The browser refuses the request either way; omitting the headers
    // is what makes the refusal explicit rather than a confusing partial success.
    return new NextResponse(null, { status: 403, headers: { Vary: "Origin" } });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin as string) });
}

export async function GET(request: NextRequest): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json(
      { error: "origin_not_allowed" },
      { status: 403, headers: { Vary: "Origin", "Cache-Control": "no-store" } },
    );
  }

  const headers = {
    ...corsHeaders(origin as string),
    // `private` as well as `no-store`: this is a per-visitor answer and must never land in a
    // shared cache, Vercel's edge included.
    "Cache-Control": "no-store, private",
  };

  // A failure here must read as "nobody is signed in", never as a 500 on someone's login page.
  // The client treats any non-OK response as "no answer" and renders the ordinary form, so a
  // thrown error would degrade identically — but answering cleanly keeps the failure off the
  // app's console and out of its error reporting.
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch {
    return NextResponse.json({ signedIn: false }, { status: 200, headers });
  }

  const label = displayLabel(session?.user);
  if (!label) return NextResponse.json({ signedIn: false }, { status: 200, headers });

  // Shape note: `user.name` is what the clients' `parseSilentSsoIdentity` reads first, so this
  // response is understood by the existing learnwitus implementation with no client change.
  return NextResponse.json({ signedIn: true, user: { name: label } }, { status: 200, headers });
}

/** Name if there is one, else the email's local part. Never the full address. See the header. */
function displayLabel(user: { name?: string | null; email?: string | null } | undefined): string | null {
  const name = user?.name?.trim();
  if (name) return name;
  const local = user?.email?.split("@")[0]?.trim();
  return local || null;
}
