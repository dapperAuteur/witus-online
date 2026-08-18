# Integrating PostHog analytics into a WitUS ecosystem app

The **action playbook** for adding product analytics to a sibling product (flashlearn-ai, witus-learn, stream-witus, bam-landing-page, contractor-os, future apps). Hand this file to Claude Code in the target repo's working directory; it is self-contained.

> **Claude Code: how to fetch this doc.** If you're reading from a sibling repo and don't have it locally, fetch from `https://raw.githubusercontent.com/dapperAuteur/witus-online/main/lib/analytics/INTEGRATE.md`. The canonical implementation files sit beside it: `posthog-provider.tsx`, `capture.ts`, `events.ts` under `lib/analytics/` in the same repo.

---

## Why this is a copy, not an npm package

Deliberate, decided 2026-07-29. The genuinely shared surface is ~130 lines; consumers span Next 15→16, React 18→19, and both npm and pnpm; and a private package would put an `NPM_TOKEN` on ~20 Vercel projects — a new install-time failure mode on 20 builds that currently have none. A package also wouldn't keep repos in sync: each pins its own semver, so you'd still bump and redeploy all 20.

Drift is instead caught by a checker in the source repo:

```sh
node scripts/check-posthog-conformance.mjs          # every repo in docs/ecosystem-repos.json
node scripts/check-posthog-conformance.mjs <path>   # one repo
```

**Run it after integrating.** It exits non-zero on drift and explains each failure. Full reasoning: `plans/26-posthog-ecosystem-rollout.md`.

---

## What you're building

One shared PostHog project, **US region**, with events separated by an `app` property. Capture is **anonymous** — no cookie, no localStorage — which is what lets the ecosystem ship **without a consent banner**. Ingest is proxied through your own domain so ad blockers can't drop events.

Analytics is **fire-and-forget and never load-bearing**. It must not block a render, break a page, or gate a user action. Keyless is a supported state: with no env var set the app renders normally and capture is simply off.

---

## Pre-reqs from the operator (BAM)

1. **Two env vars on this repo's Vercel project** (Production + Preview + Development):
   - `NEXT_PUBLIC_POSTHOG_KEY` — the shared `phc_…` project key.
   - `NEXT_PUBLIC_POSTHOG_HOST` — **`https://us.i.posthog.com`**, set explicitly. Note what this
     var does *not* do: the `/ingest` rewrite names the upstream host literally, so nothing reads
     this at build or request time. It records the region for humans and is what a future
     `posthog-node` server-side capture would read. Getting it wrong cannot misroute browser
     ingest — and setting it right cannot fix a wrong rewrite.
2. **A redeploy after they're added.** `NEXT_PUBLIC_*` is inlined at build time, so setting a var does nothing to already-deployed code.

Both are publishable and ship in the browser bundle — the `phc_` key is not a secret. **Never use a `phx_` Personal API key**; that one is a real secret and isn't needed for capture.

⚠️ **The host must be explicit.** The shared project is US. A US key pointed at the EU cluster fails **silently** — no error, no events, nothing to notice. This has already cost time once in this ecosystem; the conformance checker now treats any `eu.i.posthog.com` reference as an error.

If the env vars aren't provisioned, **still integrate** — the code is inert without them and can merge safely. Add the repo's row to `plans/user-tasks/52-posthog-env-provisioning-all-apps.md` in the witus repo.

---

## Step 1 — install

```sh
npm install posthog-js     # or pnpm add posthog-js
```

Client-side only. Add `posthog-node` **only** if you also want server-side error capture (see Step 7).

## Step 2 — proxy ingest in `next.config`

```ts
skipTrailingSlashRedirect: true,

async rewrites() {
  return [
    { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
    { source: "/ingest/:path*",        destination: "https://us.i.posthog.com/:path*" },
  ];
},
```

The `/static` rule must come first — assets come from a different upstream host than ingest.

⚠️ **`skipTrailingSlashRedirect` is required** (PostHog's endpoints use trailing slashes; Next would 308 them before the rewrite runs), and it disables trailing-slash redirects **globally** — `/about/` stops redirecting to `/about`. Before merging, confirm this app's pages set `alternates.canonical` in their metadata, or you've silently created duplicate URLs.

### ⚠️ Then check your middleware matcher

If this app has a `middleware.ts` / `proxy.ts` whose matcher is a broad negative lookahead
(`/((?!api|_next|...).*)`), it **catches `/ingest/*`** — the path you just pointed analytics at.
Two failure modes, both silent:

- **Events die — and the page still looks instrumented.** Middleware runs **before** rewrites, so a
  redirect wins over your `/ingest` rule. FlashLearnAI's auth gate would have 302'd every
  logged-out visitor's event to sign-in; stay-witus and realestate-witus 307'd `/ingest/e/` to
  `/en/ingest/e/`, which matches no rewrite and 404s. **The tell is that there is no tell:** a
  matcher excluding paths with dots (`.*\..*`) still lets `/ingest/static/array.js` through, so
  the PostHog snippet loads, the network tab looks alive, and not one event is ever recorded.
  You would conclude the app has no anonymous traffic.
- **Events get taxed.** If it only refreshes a session or resolves a tenant, each event now runs a
  database query on the hot path — the call-volume balloon these middlewares usually exist to avoid.
  (CentenarianOS and Tour Manager OS both did this.)

Fix: add `ingest` to the negative lookahead, e.g.
`'/((?!api|_next|ingest|favicon|.*\\..*).*)'`. No app route may begin with `/ingest` — that prefix
belongs to the proxy rewrite. Explicit-path matchers (`['/admin/:path*']`) need no change.

## Step 3 — copy the three files

Copy byte-for-byte into `lib/analytics/` (or `src/lib/analytics/` if the repo uses `src/`):

| File | Modify? |
|---|---|
| `posthog-provider.tsx` | **No.** Copy unchanged. |
| `capture.ts` | **No.** Copy unchanged. |
| `events.ts` | **Yes** — this one is per-app. |

**Do not modify the provider.** The init options in it *are* the privacy posture, and they're what the conformance checker asserts. If you think one needs to change, that's an ecosystem decision — raise it against `plans/26`, don't fork it locally.

## Step 4 — write this app's `events.ts`

Change `ANALYTICS_APP` to this app's slug — **the same slug as `lib/identity/clients.ts`** in the witus repo (`flashlearn`, `learn`, `stream`, …). Keep the `SHARED_EVENTS` block exactly as-is.

```ts
export const ANALYTICS_APP = "flashlearn";

export const SHARED_EVENTS = {
  signinStarted: "signin_started",
  signinSucceeded: "signin_succeeded",
  signinFailed: "signin_failed",
} as const;

export const EVENTS = {
  deckStudied: "deck_studied",
  cardFlipped: "card_flipped",
  ...SHARED_EVENTS,
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
```

### Naming rules — non-negotiable

- `snake_case`, object first, verb past tense: `deck_studied`, `checkout_started`.
- **Never put the app name in the event name.** `flashlearn_deck_studied` is wrong: it makes the same action from two apps look like two events and destroys the cross-app comparison that sharing a project exists to enable. The `app` property already carries it.
- `SHARED_EVENTS` names are **contractual** — identical in every app, so "where do people fall out of sign-in" is answerable across all of them at once. Never rename one in a single repo.
- Identify entities by **slug or id, never display name**. Names get reworded and fragment one thing into several series.

## Step 5 — mount in the root layout

```tsx
import { PostHogProvider } from "@/lib/analytics/posthog-provider";

<PostHogProvider
  apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null}
  apiHost="/ingest"
/>
```

Read the env in the **Server Component** and pass it down — don't read `process.env` inside the client component. `?? null` is what puts the provider in its supported keyless state instead of initialising with `undefined`.

If the app has locale or tenant segments, mount it in the layout that wraps everything, so route tracking covers all of them.

## Step 6 — capture events

```ts
"use client";
import { capture } from "@/lib/analytics/capture";
import { EVENTS } from "@/lib/analytics/events";

capture(EVENTS.deckStudied, { deck: deck.slug, cardCount: deck.cards.length });
```

Never call `posthog.capture()` directly — `capture()` is wrapped so a PostHog failure can't break a page, no-ops until init has run, and types the event name so a typo can't become a permanent second event in the shared project.

**Keep Server Components server-side.** If you need a click event on a server-rendered component, split just the interactive element into a small `"use client"` child (see `components/ProductLink.tsx` in the witus repo) rather than converting the whole component.

## Step 7 — optional: server-side error capture

Only if this app has meaningful server errors worth tracking. Follow `gemini/tour-manager-os/lib/analytics/posthog-server.ts` and `lib/observability/logger.ts`. Set `$process_person_profile: false` on server events so they don't burn person-profile quota.

Server-side capture never touches the browser, so it raises no consent question.

---

## Verify

Config in a dashboard proves nothing. Check what actually shipped:

```sh
APP=flashlearnai.witus.online

# key reached the browser — it's a Server Component prop, so it lives in the
# RSC payload, NOT the JS chunks. Grepping the chunks will show nothing.
curl -sS "https://$APP/" | grep -oE 'phc_[A-Za-z0-9]{10}|"apiHost":"[^"]*"' | sort -u

# proxy is live
curl -o /dev/null -w '%{http_code}\n' "https://$APP/ingest/static/array.js"   # expect 200

# conformance (from the witus repo)
node scripts/check-posthog-conformance.mjs /path/to/this/repo
```

Then load the app and check PostHog → **Activity**, filtered to `app = <slug>`.

Look at **Activity**, not **Persons**. With anonymous-only capture, Persons stays empty *by design* — that is not a fault.

---

## What is deliberately NOT enabled

Don't turn these on in one repo. Each is an ecosystem decision with a consent cost — see `plans/user-tasks/53-posthog-operator-guide.md`.

| Feature | Why not |
|---|---|
| `autocapture` | Records every click and keystroke — sign-in forms, support forms. Main event-volume cost driver. |
| Session replay | Records DOM, typing, screen content. Requires consent essentially always; school districts have hard rules on recording students. |
| A/B tests, surveys | Need stable identity across page loads → device storage → a consent banner in ~20 apps. |
| `identify()` / cross-app identity | The big prize and the big cost. Deferred as its own decision with its own consent work. |

## The trade you're inheriting

`persistence: "memory"` means **every hard navigation looks like a new visitor**. Unique visitors inflate, bounce rate breaks, returning-visitor is always zero. Within client-side route changes memory survives, so in-session flows are intact.

**Treat "users" as "sessions" and never quote a unique-visitor number.** Ratios between events — "what share of sign-ins fail" — are unaffected, and those are the questions worth answering.

## Related

- `plans/26-posthog-ecosystem-rollout.md` — decisions, SWOT, wave sequence
- `plans/user-tasks/52-…` — env provisioning checklist
- `plans/user-tasks/53-…` — operator guide: enabled/disabled features
- `scripts/check-posthog-conformance.mjs` — drift checker
