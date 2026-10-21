import { NextResponse, type NextRequest } from "next/server";

/**
 * accounts.witus.online and www.witus.online are the same Vercel project. The identity provider
 * (Better-Auth, `/api/idp`, `/accounts/sign-in`, `/account`) belongs on accounts.witus.online, but
 * witus.online's own admin sign-in (NextAuth, `/auth/*`) and dashboard (`/admin/*`) belong on
 * www.witus.online only. NextAuth builds its "Sign in with WitUS" redirect_uri from the host the
 * visitor is on, and the `witus-online` client registers only www.witus.online and witus.online
 * callbacks (lib/identity/clients.ts). Starting that flow on accounts.witus.online therefore failed
 * with {"message":"Invalid redirect URI"} (BAM, 2026-10-21). Send those paths to the site origin.
 *
 * Hosts come from config: BETTER_AUTH_URL (the IdP origin) and NEXTAUTH_URL (the site origin). The
 * literals are labeled fallbacks for production, per the authoritative-values rule.
 */
const ACCOUNTS_HOST = new URL(
  process.env.BETTER_AUTH_URL ?? "https://accounts.witus.online",
).host;
const SITE_ORIGIN = process.env.NEXTAUTH_URL ?? "https://www.witus.online";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  // Never redirect a host to itself (a misconfigured NEXTAUTH_URL would otherwise loop).
  if (host !== ACCOUNTS_HOST || new URL(SITE_ORIGIN).host === ACCOUNTS_HOST)
    return NextResponse.next();
  const target = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    SITE_ORIGIN,
  );
  return NextResponse.redirect(target, 307);
}

export const config = {
  matcher: ["/auth/:path*", "/admin", "/admin/:path*"],
};
