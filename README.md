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
