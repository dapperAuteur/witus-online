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
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "wanderlearn",
    name: "Wanderlearn",
    tagline: "Immersive 360° place-based learning",
    description:
      "Step into locations and learn by being there. Built for curious minds and classroom expeditions alike.",
    href: "https://wanderlearn.witus.online",
    accent: "sky",
    status: "beta",
    external: true,
    signInHref: "https://wanderlearn.witus.online/login",
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
    surfaces: ["public-directory", "oidc-client"],
  },
  {
    slug: "learn-witus",
    name: "Learn.WitUS",
    tagline: "Practitioner-scholar profile and curriculum",
    description:
      "BAM's research, the Better Vice Club curriculum, and academy partnerships. The teaching layer of the WitUS ecosystem.",
    href: "https://centenarianos.com/academy",
    accent: "teal",
    status: "live",
    external: true,
    // Academy lives inside CentenarianOS — sign-in is the same account as the
    // CentenarianOS tile, but we list it here too so teachers looking for the
    // Academy find a door.
    signInHref: "https://centenarianos.com/login",
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
    surfaces: ["oidc-client"],
  },
];
