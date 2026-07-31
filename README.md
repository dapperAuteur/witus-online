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
