import "server-only";

import {
  endSessionEndpointFallback,
  endSessionUrlWithClientId,
} from "@/lib/identity/sign-out-everywhere.mjs";

const DEFAULT_DISCOVERY_URL =
  "https://accounts.witus.online/api/idp/.well-known/openid-configuration";

/**
 * The IdP end-session URL (with client_id) for the "Sign out of WitUS everywhere" control, or null
 * when witus.online is not a configured "Sign in with WitUS" client (no WITUS_OIDC_CLIENT_ID), in
 * which case the control is not rendered. Resolved on the SERVER so no client component reads env.
 *
 * Read from the discovery document (the same one lib/auth.ts hands NextAuth), cached for an hour.
 * If discovery can't be fetched, fall back to better-auth's documented path beside it; the IdP
 * itself validates the request either way, and the local sign-out has already happened by then.
 */
export async function witusEndSessionUrl(): Promise<string | null> {
  const clientId = process.env.WITUS_OIDC_CLIENT_ID;
  if (!clientId) return null;
  const discoveryUrl = process.env.WITUS_OIDC_DISCOVERY_URL ?? DEFAULT_DISCOVERY_URL;

  let endpoint: string | null = null;
  try {
    const res = await fetch(discoveryUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const doc = (await res.json()) as { end_session_endpoint?: unknown };
      if (typeof doc.end_session_endpoint === "string") endpoint = doc.end_session_endpoint;
    }
  } catch {
    // Network error or timeout: use the fallback below.
  }
  return endSessionUrlWithClientId(endpoint ?? endSessionEndpointFallback(discoveryUrl), clientId);
}
