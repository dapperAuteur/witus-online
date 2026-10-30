// Sign-out meaning for witus.online as a "Sign in with WitUS" client (BAM, 2026-10-29, witus task
// 128 option (b)):
//
//   "Sign out"                      ends only the witus.online (NextAuth) session. Never the IdP.
//   "Sign out of WitUS everywhere"  ends the witus.online session, THEN sends the browser to the
//                                   IdP's end_session_endpoint so the WitUS session at
//                                   accounts.witus.online ends too. Other apps keep their own
//                                   sessions (no back-channel logout), and the help text says so.
//
// Plain JS (allowJs) with no imports so `npm test` (node --test over scripts/lib/*.test.mjs) can
// exercise it without a TypeScript loader. The server side lives in lib/identity/end-session.ts.

export const SIGN_OUT_LABEL = "Sign out";
export const SIGN_OUT_EVERYWHERE_LABEL = "Sign out of WitUS everywhere";
export const SIGN_OUT_EVERYWHERE_HELP =
  "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.";

const DISCOVERY_SUFFIX = "/.well-known/openid-configuration";

/**
 * The end-session URL with `client_id`, from the IdP's discovery document. better-auth's
 * endsession handler requires `client_id` whenever `post_logout_redirect_uri` is sent.
 * Returns null when either value is missing, which hides the "everywhere" control.
 *
 * @param {string | null | undefined} endSessionEndpoint discovery `end_session_endpoint`
 * @param {string | null | undefined} clientId this app's OIDC client id (WITUS_OIDC_CLIENT_ID)
 * @returns {string | null}
 */
export function endSessionUrlWithClientId(endSessionEndpoint, clientId) {
  if (!endSessionEndpoint || !clientId) return null;
  return `${endSessionEndpoint}?client_id=${encodeURIComponent(clientId)}`;
}

/**
 * Fallback when the discovery document can't be fetched: better-auth serves the endpoint at
 * `<basePath>/oauth2/endsession`, beside `<basePath>/.well-known/openid-configuration`. This is a
 * fallback only; the discovery document is the authoritative source.
 *
 * @param {string} discoveryUrl
 * @returns {string | null}
 */
export function endSessionEndpointFallback(discoveryUrl) {
  if (!discoveryUrl.endsWith(DISCOVERY_SUFFIX)) return null;
  return `${discoveryUrl.slice(0, -DISCOVERY_SUFFIX.length)}/oauth2/endsession`;
}

/**
 * Adds the post-logout return. TRAILING SLASH REQUIRED: better-auth exact-matches
 * post_logout_redirect_uri against the client's registered URIs, and lib/identity/clients.ts
 * registers `origin + "/"` for every client (www.witus.online and the apex for "online").
 *
 * @param {string} endSessionUrl already carries `?client_id=`
 * @param {string} origin e.g. window.location.origin
 * @returns {string}
 */
export function withPostLogoutRedirect(endSessionUrl, origin) {
  return `${endSessionUrl}&post_logout_redirect_uri=${encodeURIComponent(`${origin}/`)}`;
}

/**
 * ORDER IS THE SAFETY PROPERTY. The local session ends first (awaited, its error swallowed), and
 * only then does the browser leave for the IdP. If the IdP is down or refuses, the person is still
 * signed out of witus.online; handing off first would turn an IdP failure into "I clicked sign out
 * and I'm still signed in".
 *
 * @param {{ signOutLocal: () => Promise<unknown>, navigate: (url: string) => void,
 *           endSessionUrl: string, origin: string }} deps
 * @returns {Promise<void>}
 */
export async function signOutEverywhere({ signOutLocal, navigate, endSessionUrl, origin }) {
  try {
    await signOutLocal();
  } catch {
    // Never trap someone in a session they asked to leave; the IdP step still runs.
  }
  navigate(withPostLogoutRedirect(endSessionUrl, origin));
}
