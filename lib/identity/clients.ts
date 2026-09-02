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
  /**
   * Where the IdP sends the browser back after a GLOBAL SIGN-OUT, relative to `origin`.
   *
   * DEFAULTS TO "/" FOR EVERY REGISTERED APP (see `postLogoutRedirectUriFor`). It used to be
   * opt-in, which meant an app could ship a "Sign out of WitUS" button and have the IdP refuse
   * the return trip with `invalid_request` until a SECOND deploy of this repo registered it —
   * a cross-repo ordering trap that is invisible from the app's side. Since every entry in this
   * registry is a first-party surface that should sign out of everything, and the value is the
   * app's own root, the safe default is the useful one. Set it explicitly only to use a path
   * other than "/"; there is no reason to unset it.
   *
   * READ THIS BEFORE SETTING IT. better-auth's end_session endpoint validates
   * `post_logout_redirect_uri` against **`client.redirectUrls`**, the same array it
   * validates OAuth callbacks against — there is no separate post-logout list
   * (node_modules/better-auth/dist/plugins/oidc-provider/index.mjs, the endSession
   * endpoint: `client.redirectUrls.some((registeredUri) => post_logout_redirect_uri
   * === registeredUri)`). So `redirectUrisFor()` folds this in, and the consequence is
   * that whatever you put here ALSO becomes a valid OAuth redirect target for this
   * client. Keep it to a boring first-party landing path on the app's own origin, never
   * a path that reflects user input or forwards elsewhere.
   *
   * Matching is EXACT, including the trailing slash, so "/" registers
   * `https://app.example/` and the app must send precisely that.
   */
  postLogoutPath?: string;
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
 *  - Stay.WitUS HOTEL TENANT DOMAINS (custom domains and any `*.stay.witus.online`
 *    tenant host) — same rule, same reason. Only the WitUS-branded `stay.witus.online`
 *    operator surface participates (the `stay` entry below). Deliberately NOT
 *    registering tenant hosts is what makes the rule self-enforcing: a tenant site
 *    attempting the WitUS flow sends an unregistered redirect_uri and gets a 400.
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
  // Wanderlust (the product formerly called Wanderlearn).
  //
  // The SLUG STAYS `wanderlearn` on purpose. It is the OIDC client identity,
  // not the product name — clientIdFor() derives `witus-wanderlearn` and the
  // IdP reads WITUS_OIDC_SECRET__WANDERLEARN — so renaming it would mean
  // minting a new client, issuing a new secret, and re-pointing the app's env,
  // to change a string no user ever sees. BAM's call, 2026-08-21.
  //
  // What DOES have to change is the redirect URI. The app is moving to
  // wanderlust.witus.online, and redirect URIs are matched with strict `===`,
  // so once BETTER_AUTH_URL flips the app will send a URI this registry does
  // not know and sign-in fails with a 400. Both hosts are registered here so
  // the cutover needs no coordination: the old one keeps working until the
  // move, the new one works from the moment it happens.
  //
  // The old entry can be dropped once nothing reaches the old host directly —
  // optional tidying, since it 308-redirects anyway.
  {
    slug: "wanderlearn",
    name: "Wanderlust",
    origin: "https://wanderlust.witus.online",
    callbackPath: BETTER_AUTH_CB,
    extraRedirectUris: [`https://wanderlearn.witus.online${BETTER_AUTH_CB}`],
  },
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
  // GLOBAL SIGN-OUT, 2026-08-30. learnwitus ships "Sign out of WitUS": it ends the local
  // session and then hands the browser to this IdP's /oauth2/endsession, which ends the
  // shared session for every WitUS app. `postLogoutPath` registers where the IdP is
  // allowed to send the visitor afterwards. WHITE-LABEL TENANTS ARE UNAFFECTED: learnwitus
  // gates that redirect on the same per-tenant flag as sign-in, so a tenant learner never
  // reaches the IdP at all, and no tenant host is registered here (see the exclusion note).
  {
    slug: "learn",
    name: "Learn.WitUS",
    origin: "https://learn.witus.online",
    callbackPath: BETTER_AUTH_CB,
    postLogoutPath: "/",
  },
  // Stay.WitUS — WitUS-branded operator surface ONLY. Hotel tenant domains keep
  // product-local magic-link auth (see the exclusion note above).
  //
  // Better Auth 1.6.23 confirmed in stay-witus/package.json, so BETTER_AUTH_CB is
  // correct — but the genericOAuth plugin is NOT wired there yet: its auth.ts currently
  // runs magicLink + nextCookies only. This entry therefore lands AHEAD of the client,
  // the same way `create` did. It stays inert until WITUS_OIDC_SECRET__STAY is set here,
  // because buildTrustedClients() skips any app whose secret is unset.
  //
  // NOTE for whoever wires the client side: stay-witus resolves tenants by hostname
  // (getTenantByHost) and its trustedOrigins include the wildcard `https://*.witus.online`.
  // The WitUS sign-in option must be gated to the WitUS-branded host, NOT rendered on
  // tenant hosts — otherwise a hotel's guests get redirected to accounts.witus.online.
  { slug: "stay", name: "Stay.WitUS", origin: "https://stay.witus.online", callbackPath: BETTER_AUTH_CB },
  { slug: "stream", name: "Stream.WitUS", origin: "https://stream.witus.online", callbackPath: BETTER_AUTH_CB },
  // Commerce surfaces. shop.witus.online is the better-auth shop-witus app (distinct
  // from awesomewebstore.com, still on Shopify — see exclusion note above).
  { slug: "shop", name: "Shop.WitUS", origin: "https://shop.witus.online", callbackPath: BETTER_AUTH_CB },
  // TODO: confirm RideWitUS's auth lib; switch to NEXTAUTH_CB if it's NextAuth.
  { slug: "ride", name: "RideWitUS", origin: "https://ride.witus.online", callbackPath: BETTER_AUTH_CB },
  // Create.WitUS — collaboration call board. Repo ai-builds/claude/create-witus, still a
  // build brief (no app code yet), so this entry lands ahead of the deploy. It stays inert
  // until its secret is provisioned on the IdP: buildTrustedClients() skips any app whose
  // clientSecretEnvVar() is unset. Better Auth genericOAuth by design → BETTER_AUTH_CB.
  { slug: "create", name: "Create.WitUS", origin: "https://create.witus.online", callbackPath: BETTER_AUTH_CB },
  // VoGoat — the daily shared voiceover game. Repo ai-builds/claude/vogoat, still a build
  // brief (no app code yet), so this entry lands ahead of the deploy the same way `create`
  // did and stays inert until WITUS_OIDC_SECRET__VOGOAT is set here. Better Auth
  // genericOAuth by design → BETTER_AUTH_CB. No localhost redirect URI, deliberately: no
  // client in this registry registers one (redirect URIs are exact-match), so a dev
  // callback would be a new precedent — BAM's call, via extraRedirectUris if ever wanted.
  { slug: "vogoat", name: "VO GOAT", origin: "https://vogoat.witus.online", callbackPath: BETTER_AUTH_CB },
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
  return [
    ...new Set([
      redirectUriFor(app),
      ...(app.extraRedirectUris ?? []),
      // Folded in because better-auth validates post_logout_redirect_uri against THIS array.
      // See the note on EcosystemApp.postLogoutPath for why that is not our choice. ALL registered
      // hosts, not just the primary — see postLogoutRedirectUrisFor for the asymmetry that caused.
      ...postLogoutRedirectUrisFor(app),
    ]),
  ];
}

/**
 * The absolute URI the IdP may redirect to after a global sign-out, or null if this app
 * has not opted in.
 *
 * THE CALLING APP MUST ALSO SEND `client_id`. better-auth rejects a
 * `post_logout_redirect_uri` with `invalid_request` ("client_id is required when using
 * post_logout_redirect_uri without a valid id_token_hint") unless the request carries
 * either a verifiable `id_token_hint` or an explicit `client_id`. Sending the URI alone
 * is a 400, not a silent fallback.
 */
export function postLogoutRedirectUriFor(app: EcosystemApp): string | null {
  // "/" by default: every first-party surface participates in global sign-out. See the note on
  // EcosystemApp.postLogoutPath for why this is not opt-in any more.
  return new URL(app.postLogoutPath ?? "/", app.origin).toString();
}

/**
 * The post-logout landing URI on EVERY host this app is registered at — the primary origin plus
 * each `extraRedirectUris` origin — de-duplicated.
 *
 * WHY NOT JUST THE PRIMARY ORIGIN. An app sends `post_logout_redirect_uri` built from the host the
 * visitor is actually on (`window.location.origin`), because that is the only host it can know at
 * click time. Several apps genuinely serve from more than one: witus.online and centenarianos.com
 * from both apex and `www`, Centenarian Coach from both its hyphenated and dotted hosts (both
 * verified serving 200 on 2026-09-02), Wanderlust from its old and new hosts during the cutover.
 *
 * Registering only the primary origin produced a silent asymmetry: `ecosystemOrigins()` folds
 * `extraRedirectUris` hosts into the session-probe CORS allowlist, so "Continue as ⟨name⟩" WORKED
 * on the secondary host — and then signing out from that same host was refused, stranding the
 * visitor on the IdP's own page. Signed out correctly in both places, but with no way back. The
 * two lists are now derived from the same hosts, so they cannot disagree.
 *
 * Each entry is a boring first-party root on a host already registered for this client, which is
 * what makes it safe given that better-auth validates post-logout URIs against `redirectUrls` (see
 * the note on `EcosystemApp.postLogoutPath`) — this adds no host that was not already a valid
 * OAuth redirect target.
 */
export function postLogoutRedirectUrisFor(app: EcosystemApp): string[] {
  const path = app.postLogoutPath ?? "/";
  const origins = [app.origin];
  for (const uri of app.extraRedirectUris ?? []) {
    try {
      origins.push(new URL(uri).origin);
    } catch {
      // A malformed extra URI is a registry bug; it must not cost the other hosts their return trip.
    }
  }
  return [...new Set(origins.map((origin) => new URL(path, origin).toString()))];
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

/**
 * Every origin an ecosystem app is served from — the app's own `origin` plus the origin of
 * each `extraRedirectUris` entry (apex/`www` pairs, domain moves).
 *
 * This is the CORS allowlist for the ecosystem session probe
 * (`/api/ecosystem/session`, the endpoint behind "Continue as <name>"). Derived from the
 * registry rather than maintained by hand so a new app cannot be registered as a client and
 * then silently fail its probe.
 *
 * IT IS DELIBERATELY THE FULL REGISTRY, NOT THE PROVISIONED SUBSET. `buildTrustedClients()`
 * filters on the secret being set because an unprovisioned client must not be able to complete
 * a token exchange. The probe grants nothing — it answers "is someone signed in here, and what
 * do we call them" — so gating it on provisioning would only mean a newly-deployed app's probe
 * stays broken until an unrelated env var lands, which is exactly the kind of silent partial
 * failure this endpoint is meant to avoid.
 *
 * WHITE-LABEL HOSTS ARE ABSENT BY CONSTRUCTION. learnwitus's tenant domains and Stay.WitUS's
 * hotel domains are deliberately not in ECOSYSTEM_APPS (see the exclusion note above), so they
 * are not in this set either, and a probe from one of them is refused by CORS. That is the
 * required behaviour: a white-label surface must never learn that the ecosystem exists.
 */
export function ecosystemOrigins(
  apps: readonly EcosystemApp[] = ECOSYSTEM_APPS,
): ReadonlySet<string> {
  const origins = new Set<string>();
  for (const app of apps) {
    origins.add(new URL(app.origin).origin);
    for (const uri of app.extraRedirectUris ?? []) {
      try {
        origins.add(new URL(uri).origin);
      } catch {
        // A malformed extra URI is a registry bug, not a reason to refuse every other origin.
      }
    }
  }
  return origins;
}

/** Is this `Origin` header value allowed to make a credentialed probe request? */
export function isEcosystemOrigin(
  origin: string | null | undefined,
  apps: readonly EcosystemApp[] = ECOSYSTEM_APPS,
): boolean {
  if (!origin) return false;
  return ecosystemOrigins(apps).has(origin);
}
