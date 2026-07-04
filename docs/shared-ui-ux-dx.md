<!-- witus-shared-ui-ux-dx v1 -->
# WitUS shared UI / UX / DX conventions (canonical, flattened)

Single consolidated rule set, harvested from every ecosystem repo's `STYLE_GUIDE.md` /
`CONTRIBUTING.md` / `CLAUDE.md` and de-conflicted into one opinionated standard. Edit here; the sync
script (`scripts/sync-claude-rules.mjs`) does **not** inject this file's body into repos — instead
each repo's managed block points here, so there's one place to read. When a repo's local
`STYLE_GUIDE.md` disagrees with this file, **this file wins** and the local one should be reconciled
on next touch.

## Default stack (flattened target)

**Neon Postgres + Drizzle ORM + pnpm + Vitest (unit) + Playwright (E2E) + axe-playwright (a11y).**
New repos and existing Drizzle-lineage repos follow this.

**Grandfathered exceptions — Supabase + Postgres/RLS + npm + Jest, do NOT migrate yet:**
- **CentenarianOS** (`gemini/centenarian-os`)
- **Work.WitUS / ContractorOS** (`gemini/contractor-os`)

These two share a Supabase database and keep their RLS + Jest tooling until BAM decides otherwise.
Their DB/testing sections below apply to them; everything non-stack-specific (a11y, UX, microcopy,
git, TypeScript, naming) applies to them too.

**Pending decision — also currently on Supabase+Jest, not yet reconciled:** `tour-manager-os` and
`fly-witus`. See `plans/user-tasks/` for the migrate-or-grandfather task. Until decided, they stay
as-is; do not migrate their stack on the side.

---

## Conflict resolutions (the 12 that differed across repos)

Canonical winner in **bold**; losing variants noted so you recognize legacy code.

1. **Named exports only; `export default` only for Next.js pages/layouts. Plain `function`
   declarations — no `React.FC`.** (Legacy: default-export + `React.FC` in flashlearn UI doc, fly-witus.)
2. **Feature/domain colocation.** Server components by default; add `"use client"` only when
   interaction/state needs it; co-locate a client component beside its route, promote to
   `src/components/` only when used by ≥2 routes. (Legacy: Atomic Design in flashlearn.)
3. **Tailwind utilities only — no custom CSS files, no CSS Modules.** Dynamic-only values may use
   inline `style={{}}`. Use the `cn()` helper (`@/lib/utils`) for conditional classes.
4. **Dark mode: `prefers-color-scheme` + Tailwind `dark:` is required and must be contrast-checked.**
   A manual theme toggle is optional and a per-product choice — not banned, not mandatory.
5. **Neutrals use `slate-*`, never `gray-*`** (the most common contrast bug is `text-gray-*`).
6. **Ban em/en dashes in user-facing copy and docs; use commas, periods, parentheses.** Ban the
   stock-word list: *delve, crucial, vital, seamless, myriad, revolutionary, game-changing,
   powerful*. No filler openers, short plain sentences. Preserve brand caps (`WitUS`, `RideWitUS`,
   `CentenarianOS`, `FlashLearnAI`). (Legacy: ride-wit-us permitted em dashes sparingly.)
7. **Component files `kebab-case.tsx` → `PascalCase` component.** Hooks `useThing`; constants
   `SCREAMING_SNAKE_CASE` (local `camelCase`); booleans prefixed `is/has/should`. (Legacy: PascalCase
   filenames in cent-agility, centenarian-os, flashlearn.)
8. **Component size cap ≤ 300 lines** (soft — extract earlier when it aids clarity).
9. **No `any`. Use `unknown` and narrow; no non-null `!`.** If an `any` is truly unavoidable, use
   `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line why-comment.
10. **Server-action / API return envelope: `{ ok: true; data: T } | { ok: false; error: string;
    code: string }`. Never throw to a client component.** (Legacy: `{ data } | { error }` in TMOS.)
11. **Conventional Commits, allowed types: `feat fix chore docs refactor test style perf build ci
    a11y i18n`.** Write the message after the work, describing the actual diff.
12. **Comments: default to minimal; comment the *why* (constraint/workaround), not the *what*.
    JSDoc on exported/public functions and non-obvious props. `TODO(#issue)` format.**

---

## UI (apply everywhere)

- **Mobile-first:** design at 375×667, scale up with `sm:`/`lg:`. No horizontal scroll ≥ 320px.
- **Touch targets ≥ 44×44px:** `min-h-11` compact / `min-h-12` primary; icon buttons
  `min-h-11 min-w-11 flex items-center justify-center`.
- **Focus visible (verbatim):** `focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-current` (products may theme the color).
- **Contrast:** ≥ 4.5:1 text, ≥ 3:1 large text + UI components, verified in **both** light and dark.
- **Tailwind v4 syntax:** `shrink-0` not `flex-shrink-0`; `bg-linear-to-b` not `bg-gradient-to-b`.
- **Spacing on the 4px scale** (`p-4`, `gap-6`, `m-2`).
- **Semantic HTML + ARIA:** `<button>` for actions, `<a>`/`<Link>` for nav; icon-only buttons need
  `aria-label`; decorative icons `aria-hidden="true"`; no skipped heading levels; meaningful `alt`
  (never a filename; `alt=""` if decorative). External `target="_blank"` links get
  `rel="noopener noreferrer"` + an `sr-only` "opens in new tab" indicator.
- **Motion:** respect `prefers-reduced-motion`; hover transforms use `motion-safe:`; required
  animations get an instant-set fallback.
- **Per-product accent tokens are fine** (CentenarianOS sky/fuchsia, Work.WitUS amber, RideWitUS
  Monon-Chalk, etc.) — but neutrals stay `slate-*` and contrast rules are non-negotiable.

## UX (apply everywhere)

- **Route-level states:** use `loading.tsx` and `error.tsx`; error boundaries in client components.
- **Announce async:** loading gets `role="status"` + SR text; success `role="status"
  aria-live="polite"`; errors `role="alert"`.
- **Forms:** validate client-side for UX, server-side for security. Every input has an associated
  `<label>` (htmlFor+id); wire errors via `aria-describedby` + `role="alert"`. `aria-label` is a
  fallback, not the default.
- **Zero-alert policy:** never `alert()`/`confirm()` — use the app's Toast/Modal system.
- **Focus management:** on modal open focus first interactive element; on close return focus to the
  trigger; after route change focus the main heading. Prefer Radix Dialog (focus trap + restore).
- **Offline scope is per-product** but always: dashboard/admin/API/auth are network-only (never serve
  stale); offline queues sync on reconnect where a product supports it.
- **i18n:** en + es strings live in dictionary JSON loaded via `getDictionary(lang)` — no string
  literals in components; every new string lands in both locales in the same commit. No `next-intl`.
  Spanish is hand-translated, never machine.

## DX (apply everywhere)

- **TypeScript strict**, path alias `@/*` (base is repo-specific: `src/*` or repo root — never
  relative paths going up more than one level).
- **Next 15/16:** `params`/`searchParams` are Promises — `await` them. When an `@AGENTS.md` Next
  codemod block is present, read `node_modules/next/dist/docs/` before writing Next code
  (`middleware.ts` → `proxy.ts`).
- **Component structure order:** imports (external → internal → types) → local types → component
  (hooks → handlers → render).
- **Env vars:** `NEXT_PUBLIC_` only for browser-needed values; validate via a zod `env.ts`; never
  read/commit `.env*` except `.env.example`. Side-effect libs (email/SMS/API) degrade to a dev-log
  fallback when env is missing so preview deploys never send real traffic.
- **Secrets:** OAuth/store tokens encrypted at rest before DB; cross-repo webhooks HMAC-signed
  (5-min skew, constant-time compare).
- **Logging / PII:** log only non-sensitive identifiers (`source`, `form_type`, `submission_id`,
  `http_status`) — never payloads, bodies, secrets, signatures, emails, phones, captions, or media
  URLs. Wrap PII writes in try/catch that logs error *class names* only (ORMs leak params). No
  `console.log` left behind.
- **Media (Cloudinary):** signed uploads; build delivery URLs via helpers, never by hand; only
  surface assets with `status === "ready"`.
- **Migration → user-task gate:** any DB migration files a `plans/user-tasks/NN-run-migration-*.md`
  before the branch can merge (BAM runs prod migrations; `DATABASE_URL` from shell, never `.env`).

### Stack-specific: DATABASE

- **Default (Neon + Drizzle):** schema in `src/db/schema/*.ts` (one file per group) + barrel
  `index.ts`; `pnpm db:generate`; **never rename Drizzle-assigned migration files**; hand-edit
  generated SQL only for missed constraints, with a comment; prod via `pnpm db:migrate:prod`.
- **Grandfathered (Supabase — CentOS, ContractorOS):** numbered migrations `NNN_description.sql`;
  RLS policy in the same migration as the table (`<table>_<role>_<action>`); tables plural
  snake_case; FK `<table_singular>_id`; use `.maybeSingle()` not `.single()`; service-role client for
  RLS-bypass routes; update `seed.sql` + run `npm run db:types`. **Shared-DB safety:** migrations
  additive only (`ADD COLUMN IF NOT EXISTS`), never drop/rename shared tables/columns, copy new
  migrations to both repos, `profiles` is shared.

### Stack-specific: TESTING

- **Default (Vitest + Playwright):** Vitest for pure logic, Playwright ≥1 happy-path per critical
  flow, axe-playwright/pa11y-ci over the enumerated a11y-critical page list. Tests next to code, E2E
  in `tests/e2e/`. CI gate: typecheck + lint + unit + E2E + a11y all green before merge.
- **Grandfathered (Jest + RTL — CentOS, ContractorOS):** Jest + React Testing Library, 80%+ coverage
  on business logic, tests co-located. Test behavior not implementation (`screen` + `getByRole`).

## References for the divergence

Two lineage clusters produced most non-conflicting divergence: **Neon+Drizzle+pnpm+Vitest**
(shop-witus, witus-learn, stream-witus, wanderlearn) vs **Supabase+RLS+npm+Jest** (centenarian-os,
contractor-os, tour-manager-os, fly-witus). `flashlearn-ai/docs/guides/ui-component-guidelines.md`
and `centenarian-academy/docs/ComponentGuide.md` are the two out-of-step legacy docs (React.FC,
default exports, Atomic Design, CSS Modules) — treat them as superseded by this file.
