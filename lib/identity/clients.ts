/**
 * WitUS Accounts — first-party OAuth/OIDC client registry.
 *
 * "Registering a client" (operator task 42, step 5) means adding an entry here
 * and provisioning its secret on the IdP. First-party ecosystem apps are passed
 * to better-auth's `oidcProvider({ trustedClients })`, so they bypass the DB
 * client table and skip the consent screen. An app only comes online once its
 * secret env var is set on the IdP — so the rollout is incremental.
 *
 * This module deliberately has NO `better-auth` import: `TrustedClient` is a
 * structural mirror of the plugin's `Client` type, which keeps the registry
 * dependency-free and unit-testable, and keeps the live witus.online build green
 * until the IdP wiring (which DOES import better-auth) is added. See
 * `plans/21-witus-accounts-idp-buildout.md`.
 */

/** Structural mirror of better-auth oidcProvider's `Client` (a trustedClients entry). */
export type TrustedClient = {
  clientId: string;
  clientSecret: string;
  name: string;
  type: "web";
  redirectUrls: string[];
  metadata: Record<string, unknown> | null;
  disabled: boolean;
  skipConsent: boolean;
};

export type EcosystemApp = {
  /** Stable slug — drives the clientId and the secret env-var name. Never reuse. */
  slug: string;
  /** Human label (shown on consent screens; first-party clients skip consent). */
  name: string;
  /** Production origin the app is served from. */
  origin: string;
  /**
   * The app's OIDC redirect/callback path. This is AUTH-LIBRARY SPECIFIC:
   *   - NextAuth v4 generic OIDC provider → `/api/auth/callback/witus`
   *   - better-auth genericOAuth plugin   → `/api/auth/oauth2/callback/witus`
   * Confirm + update per app as it converts; the redirect URI must match exactly.
   */
  callbackPath: string;
  /**
   * Additional absolute redirect URIs to register beyond `origin + callbackPath`.
   * The IdP validates the incoming `redirect_uri` by EXACT match, so any host the
   * app actually sends from must be listed. Use this for apex/`www` pairs or for a
   * second domain (e.g. *.witus.online aliases). Each entry is a full absolute URL.
   */
  extraRedirectUris?: readonly string[];
};

const BETTER_AUTH_CB = "/api/auth/oauth2/callback/witus";
const NEXTAUTH_CB = "/api/auth/callback/witus";

/**
 * First-party WitUS surfaces that get "Sign in with WitUS".
 *
 * EXCLUDED ON PURPOSE (do not add):
 *  - `bettervice.club`, `elementarymba.com` — learnwitus WHITE-LABEL tenants. They
 *    keep isolated tenant-branded magic-link auth; a redirect to the IdP would
 *    reveal the shared backend. SSO is gated per-tenant inside learnwitus; only
 *    the WitUS-branded `learn.witus.online` tenant participates (the `learn` entry).
 *  - `awesomewebstore.com` — the Shopify storefront. Stays out until it migrates off
 *    Shopify. (Distinct from `shop.witus.online`, the better-auth shop-witus app, which
 *    IS a client below as `shop`.)
 */
export const ECOSYSTEM_APPS: readonly EcosystemApp[] = [
  // The host app itself. Currently NextAuth v4; migrates to better-auth (then use
  // BETTER_AUTH_CB). As the IdP host it can also read the session directly, but it
  // is registered as a client so the flow is uniform.
  //
  // `www` is PRIMARY here, and that is not a style choice. Verified live 2026-07-28:
  // https://witus.online 307s to https://www.witus.online, so www is the host that
  // actually serves the app. NextAuth v4 builds redirect_uri from the REQUEST HOST,
  // not from env — on Vercel `detectOrigin()` reads x-forwarded-host and ignores
  // NEXTAUTH_URL entirely (next-auth/utils/detect-origin.js). So the app sends
  // https://www.witus.online/api/auth/callback/witus and setting NEXTAUTH_URL cannot
  // change that. The apex is kept as a fallback in case the canonical host ever flips.
  // Same failure + same fix as centenarianos below (commit 8303045).
  {
    slug: "online",
    name: "WitUS.online",
    origin: "https://www.witus.online",
    callbackPath: NEXTAUTH_CB,
    extraRedirectUris: ["https://witus.online/api/auth/callback/witus"],
  },
  { slug: "flashlearn", name: "FlashLearnAI", origin: "https://flashlearnai.witus.online", callbackPath: NEXTAUTH_CB },
  { slug: "wanderlearn", name: "Wanderlearn", origin: "https://wanderlearn.witus.online", callbackPath: BETTER_AUTH_CB },
  { slug: "fly", name: "Fly.WitUS", origin: "https://fly.witus.online", callbackPath: BETTER_AUTH_CB },
  { slug: "tour", name: "Tour Manager OS", origin: "https://tour.witus.online", callbackPath: BETTER_AUTH_CB },
  // Supabase app: uses a custom OIDC code flow (app/api/auth/witus/*), so its
  // redirect URI is /api/auth/witus/callback, not the better-auth default.
  // The deployed site serves from `www.` and sends that as its redirect_uri
  // (confirmed from the live authorize request), so `www` is primary and the
  // apex is registered as a fallback in case the canonical host ever flips.
  {
    slug: "centenarianos",
    name: "CentenarianOS",
    origin: "https://www.centenarianos.com",
    callbackPath: "/api/auth/witus/callback",
    extraRedirectUris: ["https://centenarianos.com/api/auth/witus/callback"],
  },
  { slug: "work", name: "Work.WitUS", origin: "https://work.witus.online", callbackPath: BETTER_AUTH_CB },
  // learnwitus — WitUS-branded base tenant ONLY (white-label tenants excluded above).
  { slug: "learn", name: "Learn.WitUS", origin: "https://learn.witus.online", callbackPath: BETTER_AUTH_CB },
  { slug: "stream", name: "Stream.WitUS", origin: "https://stream.witus.online", callbackPath: BETTER_AUTH_CB },
  // Commerce surfaces. shop.witus.online is the better-auth shop-witus app (distinct
  // from awesomewebstore.com, still on Shopify — see exclusion note above).
  { slug: "shop", name: "Shop.WitUS", origin: "https://shop.witus.online", callbackPath: BETTER_AUTH_CB },
  // TODO: confirm RideWitUS's auth lib; switch to NEXTAUTH_CB if it's NextAuth.
  { slug: "ride", name: "RideWitUS", origin: "https://ride.witus.online", callbackPath: BETTER_AUTH_CB },
  // Apps BAM administers — each has a human login, so each is an OIDC client (NOT
  // API-key-only). Domains/libs marked TODO are best-guesses: a wrong redirect URI
  // fails closed (sign-in won't work until corrected), so confirm before that app
  // integrates. inbox + triage domains are confirmed.
  { slug: "inbox", name: "WitUS Inbox", origin: "https://inbox.witus.online", callbackPath: NEXTAUTH_CB },
  { slug: "triage", name: "WitUS Triage Agent", origin: "https://triage.agent.witus.online", callbackPath: NEXTAUTH_CB }, // NextAuth v4 (confirmed 2026-07 — witus provider added)
  { slug: "outbox", name: "WitUS Outbox", origin: "https://outbox.witus.online", callbackPath: NEXTAUTH_CB }, // NextAuth v4 (confirmed 2026-07 — witus provider added)
  // Coach is NextAuth v5 (confirmed 2026-07 — genericOAuth "witus" provider added
  // to its auth.ts), so it uses NEXTAUTH_CB, not BETTER_AUTH_CB. The live-serving
  // origin is the HYPHENATED host (verified: it serves the app and /signin); the
  // dotted host is registered as a fallback pending confirmation of the canonical
  // domain + that NEXTAUTH_URL matches it.
  {
    slug: "coach",
    name: "Centenarian Coach",
    origin: "https://centenarian-coach-multiagent.witus.online",
    callbackPath: NEXTAUTH_CB,
    extraRedirectUris: [
      "https://centenarian.coach.multiagent.witus.online/api/auth/callback/witus",
    ],
  },
  // Also reachable at wanderlearn.stories.witus.online; register that as a second
  // redirect URI too if users sign in from it.
  { slug: "stories", name: "Wanderlearn Stories", origin: "https://stories.wanderlearn.witus.online", callbackPath: BETTER_AUTH_CB }, // TODO: confirm auth lib
  // Custom OIDC code flow (bespoke HS256 session, no NextAuth/Better-Auth), so it
  // uses its own /api/auth/witus/callback. The app derives its origin from request
  // headers unless NEXT_PUBLIC_SITE_URL is set — set that on the app to match this
  // registered origin, or the redirect_uri won't match. Origin still unverified.
  { slug: "field-reporter", name: "Wanderlearn Field Reporter", origin: "https://wanderlearn.field.reporter.witus.online", callbackPath: "/api/auth/witus/callback" },
] as const;

/** The OAuth client_id for an app. Stable, derived from the slug. */
export function clientIdFor(slug: string): string {
  return `witus-${slug}`;
}

/** The env var (set ON THE IdP) that holds a given app's client secret. */
export function clientSecretEnvVar(slug: string): string {
  return `WITUS_OIDC_SECRET__${slug.toUpperCase().replace(/-/g, "_")}`;
}

/** The primary redirect URI registered for an app (absolute). Must match what the app sends. */
export function redirectUriFor(app: EcosystemApp): string {
  return new URL(app.callbackPath, app.origin).toString();
}

/**
 * All redirect URIs registered for an app — the primary plus any `extraRedirectUris`,
 * de-duplicated. The IdP exact-matches the incoming `redirect_uri` against this set.
 */
export function redirectUrisFor(app: EcosystemApp): string[] {
  return [...new Set([redirectUriFor(app), ...(app.extraRedirectUris ?? [])])];
}

/**
 * Build the `trustedClients` array for `oidcProvider`. An app is included only
 * when its secret env var is present on the IdP — so newly-provisioned apps come
 * online without a code change, and un-provisioned ones are silently skipped.
 *
 * @param readSecret  e.g. `(name) => process.env[name]`
 * @param apps        defaults to the full registry; override in tests
 */
export function buildTrustedClients(
  readSecret: (envVar: string) => string | undefined,
  apps: readonly EcosystemApp[] = ECOSYSTEM_APPS,
): TrustedClient[] {
  const clients: TrustedClient[] = [];
  for (const app of apps) {
    const clientSecret = readSecret(clientSecretEnvVar(app.slug));
    if (!clientSecret) continue;
    clients.push({
      clientId: clientIdFor(app.slug),
      clientSecret,
      name: app.name,
      type: "web",
      redirectUrls: redirectUrisFor(app),
      metadata: null,
      disabled: false,
      skipConsent: true,
    });
  }
  return clients;
}
