export type ProductStatus = "live" | "beta" | "coming-soon" | "infrastructure";

// Which ecosystem "surfaces" (lists) an app belongs to. This file is the CANONICAL
// ecosystem registry — every other list should reconcile against it, and app counts
// come from here, never from counting directories on disk.
//   "public-directory" — rendered in the on-site product/infra directory (homepage + footer).
//   "oidc-client"      — a first-party "Sign in with WitUS" client; MUST have a matching
//                        entry in lib/identity/clients.ts (accounts.witus.online).
// Surfaces owned by OTHER repos are intentionally not modeled here (authoritative-values rule):
//   - inbox INGEST_SOURCES is owned by claude/witus-inbox/.env (do not mirror it here).
//   - the footer sibling recipe is published in public/brand/footer-recipe.md.
export type Surface = "public-directory" | "oidc-client";

export type Accent =
  // Added 2026-08 for Wanderlust, whose Passport Stamp palette is built on
  // tangerine. It was the only unclaimed hue left in this registry.
  // Adding a value here is deliberately breaking: two exhaustive
  // Record<Accent, …> style maps (ProductCard, /account) will fail to compile
  // until they gain a matching entry, which is what stops a product rendering
  // with no accent at all.
  | "orange"
  | "amber"
  | "fuchsia"
  | "violet"
  | "sky"
  | "emerald"
  | "rose"
  | "teal"
  | "lime"
  | "slate"
  | "cyan";

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  accent: Accent;
  status: ProductStatus;
  external: boolean;
  signInHref?: string;
  surfaces: Surface[];
  /**
   * The matching `slug` in ECOSYSTEM_APPS (lib/identity/clients.ts). REQUIRED whenever
   * `surfaces` includes "oidc-client"; omit otherwise.
   *
   * This exists because the two registries use DIFFERENT slugs for the same product —
   * `flashlearnai` here is `flashlearn` there, `witus-triage-agent` is `triage`,
   * `centenarian-coach` is `coach`. Nothing connected them, so "MUST have a matching
   * entry" was a comment that no code could check: a product could claim SSO with no
   * registered client and the first sign of it would be a user hitting `invalid_client`.
   * That is the same class of silent registry gap that took ecosystem sign-in down twice
   * in July 2026 (centenarianos, then witus.online itself).
   *
   * Enforced at runtime by `scripts/check-registries.mjs`, not by the type system:
   * ECOSYSTEM_APPS is annotated `readonly EcosystemApp[]`, which widens `slug` to
   * `string`, so a literal union cannot be derived without changing that annotation.
   * The script also checks things types could not — uniqueness, and clients with no
   * product entry.
   */
  oidcSlug?: string;
}

export const SITE_URL = "https://witus.online";

export const products: Product[] = [
  {
    slug: "witus-online",
    name: "WitUS",
    tagline: "The ecosystem hub",
    description:
      "The WitUS apex site — operator admin for podcast publishing and shared ecosystem infrastructure.",
    href: SITE_URL,
    accent: "teal",
    status: "infrastructure",
    external: false,
    signInHref: "/auth/sign-in",
    oidcSlug: "online",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "witus-inbox",
    name: "WitUS Inbox",
    tagline: "Form-submission triage for the ecosystem",
    description:
      "Receives signed webhook submissions from every WitUS form (pilot signups, educator feedback, partner inquiries). One operator inbox.",
    href: "https://inbox.witus.online",
    accent: "violet",
    status: "infrastructure",
    external: true,
    signInHref: "https://inbox.witus.online/auth/sign-in",
    oidcSlug: "inbox",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "witus-outbox",
    name: "WitUS Outbox",
    tagline: "Social-publishing drafts for the ecosystem",
    description:
      "Receives signed webhooks from publisher apps (podcast publish, episode events) and lands drafts for operator review before scheduling to social.",
    href: "https://outbox.witus.online",
    accent: "cyan",
    status: "infrastructure",
    external: true,
    signInHref: "https://outbox.witus.online/auth/sign-in",
    oidcSlug: "outbox",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "centenarianos",
    name: "CentenarianOS",
    tagline: "The multi-decade personal operating system",
    description:
      "Plan your roadmap, track nutrition, log workouts, analyze your finances, manage travel, and connect it all through cross-module analytics.",
    href: "https://centenarianos.com",
    accent: "fuchsia",
    status: "live",
    external: true,
    signInHref: "https://centenarianos.com/login",
    oidcSlug: "centenarianos",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "work-witus",
    name: "Work.WitUS",
    tagline: "Job tracking and business tools for independent contractors",
    description:
      "Create jobs, log time, auto-generate invoices, scan pay stubs with AI, track mileage, and manage your schedule.",
    href: "https://work.witus.online",
    accent: "amber",
    status: "live",
    external: true,
    signInHref: "https://work.witus.online/login",
    oidcSlug: "work",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "tour-witus",
    name: "Tour Manager OS",
    tagline: "Music touring operations, end to end",
    description:
      "Advance shows, manage crew, track tour finances with split payments, and keep fans close. Everything a touring act needs in one OS.",
    href: "https://tour.witus.online",
    accent: "violet",
    status: "beta",
    external: true,
    signInHref: "https://tour.witus.online/login",
    oidcSlug: "tour",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    // Renamed from Wanderlearn 2026-08. The old host stays attached and
    // 308-redirects, so existing links keep working.
    slug: "wanderlust",
    name: "Wanderlust",
    tagline: "Immersive 360° place-based learning",
    description:
      "Step into locations and learn by being there. Built for curious minds and classroom expeditions alike.",
    href: "https://wanderlust.witus.online",
    // `sky` was this product's accent under the old name; `orange` matches the
    // Passport Stamp palette it now ships and was the only unclaimed hue in
    // this registry.
    accent: "orange",
    status: "beta",
    external: true,
    signInHref: "https://wanderlust.witus.online/login",
    // DELIBERATELY still "wanderlearn" after the product rename. The slug here
    // is the OIDC client identity, not the product name: clientIdFor() derives
    // `witus-<slug>` and the IdP secret is WITUS_OIDC_SECRET__<SLUG>, so
    // renaming it means minting a new client, re-issuing a secret, and
    // re-pointing the app's env — for no user-visible gain. BAM's call
    // (2026-08-21): keep the existing credentials, rename the product only.
    //
    // The new host is handled in lib/identity/clients.ts via extraRedirectUris
    // rather than by changing this.
    oidcSlug: "wanderlearn",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "fly-witus",
    name: "Fly.WitUS",
    tagline: "UAS pre-flight checks and flight records",
    description:
      "Pre-flight documentation, weather briefings, and compliant flight logs for recreational and commercial UAS operators.",
    href: "https://fly.witus.online",
    accent: "emerald",
    status: "beta",
    external: true,
    signInHref: "https://fly.witus.online/login",
    oidcSlug: "fly",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "flashlearnai",
    name: "FlashLearnAI",
    tagline: "Spaced-repetition vocabulary study",
    description:
      "AI-assisted decks that adapt to what you actually forget. Designed for language learners, test-prep, and lifelong study.",
    href: "https://flashlearnai.witus.online",
    accent: "rose",
    status: "beta",
    external: true,
    signInHref: "https://flashlearnai.witus.online/login",
    oidcSlug: "flashlearn",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "learn-witus",
    name: "Learn.WitUS",
    tagline: "Practitioner-scholar profile and curriculum",
    description:
      "BAM's research, the Better Vice Club curriculum, and academy partnerships. The teaching layer of the WitUS ecosystem.",
    // CORRECTED 2026-08. This said centenarianos.com/academy, and the comment
    // below it said the Academy lives inside CentenarianOS. Both were wrong:
    // Learn.WitUS is a STANDALONE multi-tenant LMS at learn.witus.online (see
    // its own README, titled "Learn.WitUS.Online"), whose launch tenant is
    // Better Vice Club on its own domain. The wrong URL had been mirrored into
    // roughly eighteen sibling repos from this entry.
    href: "https://learn.witus.online",
    accent: "teal",
    status: "live",
    external: true,
    signInHref: "https://learn.witus.online/login",
    oidcSlug: "learn",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "awesomewebstore",
    name: "AwesomeWebStore",
    tagline: "BAM's merch store",
    description:
      "Shirts, prints, and artifacts from the WitUS universe. The commerce side of the brand.",
    href: "https://awesomewebstore.com",
    accent: "lime",
    status: "live",
    external: true,
    // Commerce checkout, not a WitUS account. Linked to the store homepage
    // where returning customers can view orders.
    signInHref: "https://awesomewebstore.com",
    // Shopify storefront — deliberately NOT an OIDC client (no "Sign in with WitUS").
    surfaces: ["public-directory"],
  },
  {
    slug: "witus-triage-agent",
    name: "Triage.Agent.WitUS",
    tagline: "Human-in-the-loop triage for the WitUS Inbox",
    description:
      "A LangGraph agent that classifies WitUS Inbox submissions, proposes an action, and routes through a human approval gate before executing anything.",
    href: "https://triage.agent.witus.online",
    accent: "violet",
    status: "beta",
    external: true,
    // Operator-only dashboard — NextAuth admin sign-in, not a public WitUS account.
    signInHref: "https://triage.agent.witus.online/login",
    oidcSlug: "triage",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "stream-witus",
    name: "Stream.WitUS",
    tagline: "Cross-media tracker + All The Spoilers companion",
    description:
      "A personal-first tracker for the books, movies, and TV you watch and read — tie each title to the All The Spoilers podcast episode that discusses it, with the ReadWitUS book club running on the same library.",
    href: "https://stream.witus.online",
    accent: "rose",
    status: "beta",
    external: true,
    signInHref: "https://stream.witus.online/login",
    oidcSlug: "stream",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "centenarian-coach",
    name: "Centenarian Coach",
    tagline: "Multi-agent coaching — ask once, get a cited answer",
    description:
      "A LangGraph supervisor with specialist agents: ask one question, the supervisor decides which specialists to consult, each runs its own retrieval and tools, and the answer comes back synthesized with citations.",
    href: "https://centenarian.coach.multiagent.witus.online",
    accent: "fuchsia",
    status: "beta",
    external: true,
    signInHref: "https://centenarian.coach.multiagent.witus.online/login",
    oidcSlug: "coach",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "shop-witus",
    name: "Shop.WitUS",
    tagline: "Embeddable ecommerce-catalog layer",
    description:
      "A self-service, embeddable ecommerce-catalog layer for the WitUS ecosystem — drop a product catalog into any WitUS surface. (Distinct from AwesomeWebStore, the Shopify merch storefront.)",
    href: "https://shop.witus.online",
    accent: "slate",
    status: "infrastructure",
    external: true,
    signInHref: "https://shop.witus.online/login",
    oidcSlug: "shop",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "stay-witus",
    name: "Stay.WitUS",
    tagline: "Hotel websites that take bookings themselves",
    description:
      "White-label hotel websites with real-time booking (mobile money and cards), self-service content management, a vetted concierge partner network, and guest broadcast messaging. Repo: ai-builds/claude/stay-witus.",
    href: "https://stay.witus.online",
    accent: "emerald",
    // Flipped 2026-07-15: live demo at demo.stay.witus.online, booking +
    // admin + billing all functional; first customer launches Dec 2026.
    status: "beta",
    external: true,
    signInHref: "https://stay.witus.online/sign-in",
    // SSO applies to the WitUS-BRANDED host only (stay.witus.online) — the platform
    // owner + staff surface. Hotel tenant sites keep product-local Better Auth magic
    // links, sent from the hotel's own domain under the hotel's brand
    // (stay-witus/src/lib/auth.ts, getTenantByHost) — the learnwitus white-label
    // precedent. A "Sign in with WitUS" button on a hotel's site would reveal the
    // shared backend to that hotel's guests, which is the thing the rule exists to
    // prevent. Registering ONLY this origin enforces that: a tenant custom domain
    // would send an unregistered redirect_uri and fail closed.
    surfaces: ["public-directory", "oidc-client"],
    oidcSlug: "stay",
  },
  {
    slug: "realestate-witus",
    name: "RealEstate.WitUS",
    tagline: "360° tours that sell property, embeddable anywhere",
    description:
      "Virtual tours for commercial and residential real estate for sale: professionally captured 360° tours as branded listing pages, with copy-paste embeds for agents' own websites. Repo: ai-builds/claude/realestate-witus.",
    href: "https://realestate.witus.online",
    accent: "slate",
    status: "coming-soon",
    external: true,
    // Product-local Better Auth like Stay.WitUS — not an OIDC client.
    surfaces: ["public-directory"],
  },
  {
    slug: "create-witus",
    name: "Create.WitUS",
    tagline: "Find someone to make the thing with",
    description:
      "A collaboration call board for creators, makers, STEAM folks, and artists. Post a time-bound call — a sign painter for a 3-week mural, a welder for Saturday, a co-writer for a track — and approved members answer it. Profiles show what you make, not your face. Repo: ai-builds/claude/create-witus.",
    href: "https://create.witus.online",
    accent: "amber",
    status: "coming-soon",
    external: true,
    signInHref: "https://create.witus.online/auth/sign-in",
    // "Sign in with WitUS" client — matching entry in lib/identity/clients.ts (slug `create`).
    oidcSlug: "create",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    // VoGoat — the daily shared voiceover game. Repo: ai-builds/claude/vogoat, a build brief
    // with no app code yet, so this lands ahead of the deploy the same way create-witus did.
    slug: "vogoat",
    name: "VO GOAT",
    tagline: "The daily voiceover game",
    description:
      "One shared voice recipe a day: everyone gets the same absurd recipe, the same mundane micro-script, and the same cartoon creature. Record your best take, submit one, collect the creature in your Menagerie, and share a spoiler-free card.",
    href: "https://vogoat.witus.online",
    // Shared with AwesomeWebStore and RideWitUS on purpose — no new Accent value (see the
    // note on the Accent type for why adding one is deliberately breaking).
    accent: "lime",
    status: "coming-soon",
    external: true,
    signInHref: "https://vogoat.witus.online/sign-in",
    // "Sign in with WitUS" client — matching entry in lib/identity/clients.ts (slug `vogoat`).
    oidcSlug: "vogoat",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "ride-witus",
    name: "RideWitUS",
    tagline: "Community transport, built on the Monon",
    description:
      "Rideshare and community transport for the WitUS ecosystem — driver and rider tools with the Monon-Chalk brand identity.",
    href: "https://ride.witus.online",
    accent: "lime",
    status: "beta",
    external: true,
    signInHref: "https://ride.witus.online/login",
    // Real standalone product; was missing from this registry while present in
    // lib/identity/clients.ts. Added 2026-07-04 during registry reconciliation.
    oidcSlug: "ride",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "wanderlearn-field-reporter",
    name: "Wanderlearn Field Reporter",
    tagline: "Turns a raw capture into a publishable lesson",
    description:
      "A LangGraph agent that turns a raw Wanderlearn capture (location transcript, GPS, photo metadata) into a publishable lesson — it researches the location, drafts an outline, writes a cited script, then self-critiques against a rubric and revises until it passes.",
    href: "https://wanderlearn.field.reporter.witus.online",
    accent: "cyan",
    status: "infrastructure",
    external: true,
    signInHref: "https://wanderlearn.field.reporter.witus.online/login",
    oidcSlug: "field-reporter",
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "wanderlearn-stories",
    name: "Wanderlearn Stories",
    tagline: "Story-format module of Wanderlearn",
    description:
      "The stories module of Wanderlearn — a distinct deploy and SSO client, but a sub-surface of the Wanderlearn product rather than a standalone marketing tile.",
    href: "https://stories.wanderlearn.witus.online",
    accent: "sky",
    status: "beta",
    external: true,
    signInHref: "https://stories.wanderlearn.witus.online/login",
    // Registered as an OIDC client (present in lib/identity/clients.ts as `stories`)
    // but intentionally NOT surfaced in the public product directory — it's part of
    // Wanderlearn, not a separate product. Added 2026-07-04 during reconciliation.
    oidcSlug: "stories",
    surfaces: ["oidc-client"],
  },
];
