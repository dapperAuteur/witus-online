# WitUS.online

The parent brand platform for the WitUS ecosystem. It's a philosophy-first site connecting [CentenarianOS](https://centenarianos.com) and [Work.WitUS](https://work.witus.online).

## About

WitUS.online establishes the brand and philosophy behind the WitUS platform: **Live Long. Work Free.** It serves as the public-facing home for the ecosystem before a user ever logs into either product. It's the "why" behind both apps.

Operated by B4C LLC / AwesomeWebStore.com. Built by [Brand Anthony McDonald](https://brandanthonymcdonald.com).

## Branding Hierarchy

```
B4C LLC / AwesomeWebStore.com  ← legal entity
└── WitUS.online               ← parent brand (this repo)
    ├── CentenarianOS.com      ← multi-decade personal OS
    └── Work.WitUS.Online      ← contractor management platform
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |
| Auth (this site) | NextAuth v4 — magic-link email sign-in, plus "Sign in with WitUS" |
| Auth (as IdP) | Better Auth `oidcProvider`, mounted at `/api/idp` |
| Ecosystem SSO | `/api/ecosystem/session` probe ("Continue as ⟨name⟩") + `/api/idp/oauth2/endsession` global sign-out |
| Database | Neon Postgres via Drizzle — two databases: site content, and identity |

## Pages

| Route | Description |
|---|---|
| `/` | Philosophy-first hero + product cards |
| `/about` | Manifesto + BAM background |
| `/roadmap` | Public roadmap for both platforms |
| `/account` | Shared account explainer + FAQ |
| `/terms` | Umbrella terms of service |
| `/privacy` | Privacy policy covering both apps |

## Quick Start

```bash
npm install
vercel env pull      # required — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Environment is not optional.** `lib/env.ts` validates at import time and throws on missing
values, so both `npm run dev` and `npm run build` fail fast without `NEXTAUTH_SECRET`,
`EMAIL_SERVER`, `EMAIL_FROM`, and `ADMIN_EMAIL`. `vercel env pull` is more reliable than
hand-editing `.env.local`, and avoids the credential drift `scripts/check-oidc-env.mjs` exists
to detect. See `.env.example` for the full list.

## Project Structure

```
witus-online/
├── app/
│   ├── layout.tsx          # Root layout, metadata, fonts
│   ├── page.tsx            # Landing page
│   ├── about/page.tsx      # Philosophy + founder background
│   ├── roadmap/page.tsx    # Public product roadmap
│   ├── account/page.tsx    # Shared account info + FAQ
│   ├── terms/page.tsx      # Terms of service
│   ├── privacy/page.tsx    # Privacy policy
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx       # Reusable card with amber/fuchsia accent
│   ├── ManifestoSection.tsx  # Bold pullquote block
│   └── RoadmapItem.tsx       # Status-badged roadmap row
├── lib/
│   ├── products.ts           # Public product directory + SITE_URL
│   ├── auth.ts               # NextAuth v4 — this site's own sign-in
│   └── identity/
│       ├── clients.ts        # OIDC client registry (see below)
│       └── auth.ts           # Better Auth oidcProvider — the IdP itself
├── db/                       # Drizzle schema + migrations (site + identity)
├── scripts/                  # Operator CLIs (see Scripts)
└── public/
```

## Identity provider (Sign in with WitUS)

This repo is both the ecosystem's **IdP** (serving `accounts.witus.online` from `/api/idp`)
and a **client of itself**, so ecosystem apps and this site use the same sign-in flow.

First-party apps are registered in [`lib/identity/clients.ts`](lib/identity/clients.ts) as
`ECOSYSTEM_APPS` and passed to `oidcProvider({ trustedClients })`, which lets them bypass the
DB client table and skip the consent screen. An app only comes online once its secret env var
(`WITUS_OIDC_SECRET__<SLUG>`) is set here — `buildTrustedClients()` skips any app without one,
so the rollout is incremental and a missing secret is a normal mid-rollout state.

Two rules worth knowing before touching the registry:

- **Redirect URIs are compared with strict `===`.** No URL parsing, no host normalization, no
  trailing-slash tolerance. `https://www.example.com/cb` will never match `https://example.com/cb`.
  If an app serves from both a `www` and an apex host, register **both** via `extraRedirectUris`
  — this has taken ecosystem sign-in down twice.
- **The callback path is auth-library specific.** NextAuth uses `/api/auth/callback/witus`;
  Better Auth's `genericOAuth` uses `/api/auth/oauth2/callback/witus`. Confirm per app.

Note that on Vercel, `NEXTAUTH_URL` is **ignored** — NextAuth derives the origin from the
`x-forwarded-host` header, so the `redirect_uri` an app sends is whatever host the user browsed
to. That host is what must be registered; no env var can override it.

### `GET /api/ecosystem/session` — the ecosystem session probe

The endpoint behind **"Continue as ⟨name⟩"**. An ecosystem app's sign-in page calls this
cross-origin, with credentials, before it makes anyone type an email: *does this browser already
have a WitUS session, and what do we call them?* A positive answer becomes a button whose click
runs the real OIDC code flow.

```
GET https://accounts.witus.online/api/ecosystem/session
  Origin: https://<a registered ecosystem origin>
  credentials: include

200 {"signedIn": true, "user": {"name": "Brand Anthony McDonald"}}
200 {"signedIn": false}
403 {"error": "origin_not_allowed"}       // no CORS headers at all
```

**It returns a display label and nothing else** — no session token, session id, expiry, user id, or
full email address. `name` is the user's name when set, otherwise the **local part** of their email.
This is deliberate and load-bearing: better Auth's own `/api/idp/get-session` returns the full
`{ session, user }` with the **session token** inside it, so opening *that* route to credentialed
CORS would hand every ecosystem origin — and anything with an XSS foothold on any one of them — a
live IdP session token. This endpoint exists precisely so that never has to happen.

The response crosses an origin boundary, so to the receiving app it is client-supplied data by
definition. **It must never authenticate anyone.** It is copy for a button label.

CORS is credentialed and echoes the caller's origin (the `*` wildcard is illegal with credentials),
with `Vary: Origin` and `Cache-Control: no-store, private`. The allowlist is
`ecosystemOrigins()` — derived from `ECOSYSTEM_APPS`, so it cannot drift from the client registry.
**White-label hosts are excluded by construction**, not by a second rule: learnwitus tenant domains
and Stay.WitUS hotel domains are deliberately absent from `ECOSYSTEM_APPS`, so a probe from one of
them gets a 403 and the ecosystem stays invisible to it. Local `http://localhost` origins are
allowed outside production only.

A blocked or failed probe is **invisible by design** — the calling app renders its ordinary sign-in
form. Safari (ITP) and Firefox (Total Cookie Protection) block the IdP's third-party cookie and so
answer nothing; that is a supported degraded state, not a bug.

### Global sign-out

Signing out of any WitUS app ends the shared session for all of them, via better Auth's
`end_session_endpoint` (`/api/idp/oauth2/endsession`). Two things about the registry make it work:

- **`postLogoutPath` defaults to the app's own root, on every host the app is registered at.** It used to be
  opt-in with only `learn` set, which meant an app could ship a "Sign out of WitUS" button and have
  its return trip refused with `invalid_request` until a *second, separate* deploy of this repo
  registered it — a cross-repo ordering trap invisible from the app's side. Note that better Auth
  validates `post_logout_redirect_uri` against `client.redirectUrls`, the same array as OAuth
  callbacks, so `redirectUrisFor()` folds it in; matching is exact, trailing slash included.
  "Every host" matters for the four apps that serve from more than one (`witus.online` and
  `centenarianos.com` from apex + `www`, Centenarian Coach from two hosts, Wanderlust across its
  domain move): an app builds the URI from `window.location.origin`, the only host it knows at
  click time, and `ecosystemOrigins()` already lets the probe answer on all of them — so
  registering only the primary made "Continue as" work on a secondary host while sign-out from
  that same host stranded the visitor on the IdP page.
- **`trustedOrigins` covers the ecosystem.** The endSession handler refuses a logout that is
  neither same-site nor carrying a matching `id_token_hint`, accepting `Sec-Fetch-Site` of
  `same-origin | same-site | none` **or** an `origin`/`referer` that passes `isTrustedOrigin`.
  Every `*.witus.online` app is same-site and always passed; **centenarianos.com is a different
  registrable domain** and was rejected outright. Listing the ecosystem origins is what lets its
  `referer` through, and avoids plumbing an `id_token_hint` through every client.

Calling apps must send `client_id` alongside `post_logout_redirect_uri` — better Auth returns
`invalid_request` without it (or a verifiable `id_token_hint`), and clients have no id_token
browser-side. Apps destroy their **local** session first and only then hand off, so an unreachable
or refusing IdP still leaves the person signed out locally.

## Scripts

```bash
node scripts/gen-oidc-client.mjs <slug>   # mint an OAuth client for a registered app
node scripts/check-oidc-env.mjs [file]    # audit WITUS_OIDC_* against the registry
node scripts/check-sentry-scrub.mjs       # prove the error-report scrubber removes credentials
node scripts/sync-library.mjs <files...>  # upsert local markdown into the private library
```

**`gen-oidc-client.mjs`** generates a `client_id` + `client_secret` for one app and prints which
env vars go on which Vercel project. It refuses slugs absent from `ECOSYSTEM_APPS`, because a
secret for an unregistered app silently does nothing while reading as provisioned. It also prints
the registered redirect URIs so the secret and the callback URL get provisioned together.

**`check-oidc-env.mjs`** audits an env file (default `.env.local`) and exits non-zero on error.
It catches one secret reused under several names, a key defined twice with different values,
secrets for unregistered apps, and a `WITUS_OIDC_CLIENT_ID` that isn't this site's own. Secrets
are never printed — values are compared and shown as 8-character SHA-256 fingerprints, so it is
safe to run in a shared terminal or CI log.

Both know that the host app legitimately sets the same secret under two names
(`WITUS_OIDC_CLIENT_SECRET` and `WITUS_OIDC_SECRET__ONLINE`), since it is its own client, and
report that pair as correct rather than as reuse.

**`check-sentry-scrub.mjs`** builds a Sentry event carrying realistically-shaped credentials (a
magic-link callback URL, an OIDC `code` and `client_secret`, a `postgres://` and an `smtp://` URI
with the password inline, a JWT, a session cookie, an HMAC, a learner email), runs it through
`lib/sentry-scrub.ts`, then fails if any of those values survives **anywhere** in the serialised
payload. Needs no DSN, no network, and no test runner. It caught two real leaks on its first run.

**`sync-library.mjs`** uploads long-form internal documents (interview prep, the commercial
playbook, per-app chapters) into the `library_document` table, readable at `/admin/library` by
the `ADMIN_EMAIL` account only. The content deliberately lives in the database rather than the
repo: this repo is public, so committing the markdown would publish it regardless of the auth
gate. Slug comes from the filename (minus any `YYYY-MM-DD-` prefix), title from the first `# `
heading, ordering from argument position. Re-running upserts in place.

### Database

```bash
npm run db:generate          # site DB — generate migration from schema
npm run db:migrate           # site DB — apply migrations
npm run db:identity:generate # identity DB — generate migration
npm run db:identity:migrate  # identity DB — apply migrations
```

## Uptime monitoring

**Point every uptime monitor at `/api/health`, not at `/`.**

`/` is a statically prerendered marketing page, so it answers 200 from the CDN whether or not the
database is reachable. A green check on it means "Vercel is up", which is not the question anyone
is asking. `/api/health` (`app/api/health/route.ts`) runs a real `SELECT 1` against the site
database on every request, so a green check means the app can serve real data.

| Condition | Status | Body |
|---|---|---|
| Database answered | `200` | `{"ok":true,"checks":{"database":"ok"},"time":"<ISO>"}` |
| Anything else | `503` | `{"ok":false,"error":"database_unreachable","time":"<ISO>"}` |

`HEAD` is supported and returns the same status with no body, for monitors that probe that way.

Four properties are load-bearing, so keep them if you touch the route:

- **The failure body is a fixed literal.** It never contains the underlying error. `STORAGE_DATABASE_URL`
  is a `postgres://` URI with the password **inline**, and a connection failure puts it verbatim in
  the error message (the same hazard `lib/sentry-scrub.ts` exists to contain). This endpoint is
  public and unauthenticated, so every failure collapses to `database_unreachable`: no message, no
  stack, no host, no cause. The failure path logs a constant string for the same reason, rather than
  the error object.
- **It reports nothing else.** No version, no commit, no env values, no counts.
- **Never cached**, via `dynamic = "force-dynamic"` plus `Cache-Control: no-store`. A cached health
  check is the exact failure this route was added to fix.
- **4 second ceiling**, enforced twice (an `AbortSignal.timeout` on the fetch and a `Promise.race`
  around the query), so a hung database returns 503 quickly instead of holding the monitor open
  until its own timeout fires and reports an ambiguous "request timed out".

It deliberately does **not** go through `getEnv()` / `getDb()`. `lib/env.ts` validates the whole env
at once, so a missing `NEXTAUTH_SECRET` or `EMAIL_FROM` would make the endpoint report "unhealthy"
for a mail-config gap unrelated to whether the app and database are alive. It reads the connection
string straight from `STORAGE_DATABASE_URL` / `DATABASE_URL` instead, accepting both names exactly
as `lib/env.ts` normalizes them.

## Error monitoring

Crash reporting goes to **Better Stack**, which ingests over the Sentry protocol, so the code is the
standard `@sentry/nextjs` SDK and switching vendors later is one env var.

**It is inert until a DSN is set.** Every init is guarded (`SENTRY_DSN` for the server and edge
runtimes, `NEXT_PUBLIC_SENTRY_DSN` for the browser), so with the vars unset nothing initialises and
nothing is sent. See `.env.example` for the full list, and `plans/user-tasks/` for the provisioning
task.

| File | Role |
|---|---|
| `lib/sentry-scrub.ts` | `beforeSend` scrubber. Drops `user.email` / `ip_address` / `username`, request cookies, and the `cookie` / `authorization` / `set-cookie` / `x-witus-signature` headers; redacts token-bearing URLs, credentialed `postgres://` + `smtp://` URIs, JWTs, emails, and labelled secrets from messages, exception values, request data, breadcrumbs, and `extra` |
| `instrumentation.ts` | `register()` per runtime + `onRequestError`, tagging the request host (this deployment answers as both the marketing site and the IdP) |
| `instrumentation-client.ts` | Browser init + `onRouterTransitionStart` |
| `sentry.server.config.ts` / `sentry.edge.config.ts` | Per-runtime init, `tracesSampleRate: 0`, `sendDefaultPii: false` |
| `app/global-error.tsx` | `captureException` for root-layout crashes, which never reach `onRequestError` |

The scrubber is deliberately stricter than a default install because this deployment is the
ecosystem's **IdP**: a crash here can carry a magic-link token, an OIDC client secret, or the
inline password from `EMAIL_SERVER` / `STORAGE_DATABASE_URL`. Run `node scripts/check-sentry-scrub.mjs`
after touching it.

## Distributed tracing

Traces go to **Honeycomb** over OTLP via `@vercel/otel` (`otel.config.ts`, registered from
`instrumentation.ts` **before** the Sentry configs load — whoever registers the global tracer
provider first wins, and Sentry is told to stand down via `skipOpenTelemetrySetup`). Service name is
`witus-online` for both hostnames; spans carry the request host for splitting.

- **Inert until the key is set**: `HONEYCOMB_INGEST_API_KEY_SECRET` (fallback `HONEYCOMB_API_KEY`).
  Same guard pattern as the Sentry DSN.
- **`/api/health` spans are dropped at the sampler** — uptime monitors probe it around the clock,
  and those requests must not spend Honeycomb's free-tier event budget.
- The point is the **cross-app trace**: outbound `fetch` propagates W3C `traceparent`, the Inbox
  persists it per submission, and the triage agent continues it — one waterfall from a form submit
  to the triage run. Design + rollout: `plans/30-observability-e2e-tutorials-rollout.md`.

## E2E + accessibility CI

Playwright specs live in `e2e/`; the gate runs in `.github/workflows/e2e.yml` on `deployment_status`
— it tests the **real Vercel deployment URL** (preview → full suite, production → `@smoke` only), so
CI needs no secrets, database, or env. The suite runs desktop plus a 360px mobile project (the
charter is mobile-first), and every covered page must pass an axe check with **zero serious or
critical WCAG A/AA violations** — the gate is strict on purpose; fix the page, not the gate.

- Local runs: `PLAYWRIGHT_BASE_URL=<url> npx playwright test` (drives installed Chrome; Playwright's
  bundled chromium doesn't support macOS 13).
- If the Vercel project enables Deployment Protection, set the project's "Protection Bypass for
  Automation" secret as the `VERCEL_AUTOMATION_BYPASS_SECRET` Actions secret; public previews need
  nothing.
- **All Playwright traffic is tagged** with `x-witus-origin-test: playwright-synthetic` (ecosystem
  convention, both the CI suite and tutorial recordings). `otel.config.ts` surfaces it as the
  `witus.origin_test` span attribute, so Honeycomb queries separate synthetic runs from real users
  — filter on attribute-absent for real traffic. Tag, not a drop: synthetic traces still flow.

## Tutorials (tutorial-as-test)

Tutorial flows are Playwright specs in `e2e/tutorials/*.tutorial.ts` — each step carries a `title`,
the `narration` line BAM records, and the browser action, so the docs and video can never drift
from the UI. `npm run tutorial:record` (against `PLAYWRIGHT_BASE_URL`, config
`playwright.tutorial.config.ts`) captures per-step screenshots, timing marks, and video;
`npm run tutorial:docs` writes the committed markdown + screenshots under `docs/tutorials/`;
`npm run tutorial:video <slug>` composes the narrated mp4 from per-step audio in `audio/<slug>/`
(videos, audio, and intermediates are gitignored). Narration master:
`plans/31-tutorial-narration-scripts.md`.

## Design

- **Navy foundation** (`#020617`) with white text, neutral, not product-specific
- **Amber** accents for Work.WitUS elements
- **Fuchsia** accents for CentenarianOS elements
- Marketing pages are statically prerendered; `/admin` and the auth + IdP API routes are server-rendered on demand

## Deployment

Deployed on Vercel. Pushes to `main` trigger automatic production deploys.

```bash
# Manual deploy
npx vercel --prod
```

## License

Proprietary B4C LLC / AwesomeWebStore.com
