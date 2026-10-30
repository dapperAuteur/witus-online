/**
 * Ecosystem roadmap registry: every WitUS app and where its roadmap file lives.
 *
 * Built from docs/ecosystem-repos.json (`source` + `targets`), lib/products.ts and
 * lib/identity/clients.ts. Every `githubRepo` below was read from the authoritative source,
 * `git -C <localPath> remote get-url origin`, on 2026-10-29 (authoritative-values rule in
 * CLAUDE.md); none is inferred from a folder name. `scripts/check-registries.mjs` re-checks that
 * every ecosystem-repos.json path has exactly one entry here and, on a machine where the path
 * exists, that its origin remote still matches `githubRepo`.
 *
 * Where a roadmap lives:
 *   - An app with its own GitHub repo keeps `docs/roadmap.md` on `main` of that repo.
 *   - An app with no repo (an idea, or a hosted product such as the Shopify store) keeps
 *     `docs/roadmaps/<slug>.md` in this repo (dapperAuteur/witus-online).
 *   - `roadmapRepo: null` means no GitHub remote: the page lists the app with that status.
 *
 * Adding an app: add an entry here in the same change that adds it to docs/ecosystem-repos.json
 * (Ecosystem onboarding rule in CLAUDE.md), and give it a roadmap file on day one.
 *
 * No imports and no runtime-only TypeScript (enums, namespaces), so `node --experimental-strip-types`
 * can load it from scripts/check-registries.mjs.
 */

export type RoadmapApp = {
  /** Stable slug, unique here. The lib/products.ts slug when the app is a directory product. */
  slug: string;
  /** Display name until the roadmap's own `name` is read. */
  name: string;
  /** The app's entry in docs/ecosystem-repos.json (source or targets); null when it has no repo. */
  localPath: string | null;
  /** The app's own code repo as "owner/repo", from its origin remote; null when it has none. */
  githubRepo: string | null;
  /** The repo that holds the roadmap file as "owner/repo"; null = no GitHub remote. */
  roadmapRepo: string | null;
  /** Path of the roadmap file inside `roadmapRepo`. */
  roadmapPath: string;
  /** Branch read for the roadmap and for "last commit to main". */
  branch: string;
  /** Other slugs a roadmap's `app:` field may use for this app (repo name, OIDC client slug). */
  aliases: readonly string[];
  /** lib/products.ts slug, when the app is a directory product. */
  productSlug?: string;
  /** One line shown under the name, for apps whose identity is easy to confuse. */
  note?: string;
};

const OWNER = "dapperAuteur";
const WITUS_REPO = `${OWNER}/witus-online`;
const AI = "/Users/bam/Code_NOiCloud/ai-builds";
const CENT = "/Users/bam/Code_NOiCloud/cent";

/** An app whose own repo holds `docs/roadmap.md` on main. */
function inRepo(
  slug: string,
  name: string,
  localPath: string,
  repo: string,
  extra: Partial<Pick<RoadmapApp, "aliases" | "productSlug" | "note">> = {},
): RoadmapApp {
  return {
    slug,
    name,
    localPath,
    githubRepo: `${OWNER}/${repo}`,
    roadmapRepo: `${OWNER}/${repo}`,
    roadmapPath: "docs/roadmap.md",
    branch: "main",
    aliases: extra.aliases ?? (repo === slug ? [] : [repo]),
    productSlug: extra.productSlug,
    note: extra.note,
  };
}

/** An app with no repo of its own: its roadmap is `docs/roadmaps/<slug>.md` in witus-online. */
function inWitus(
  slug: string,
  name: string,
  extra: Partial<Pick<RoadmapApp, "githubRepo" | "aliases" | "productSlug" | "note">> = {},
): RoadmapApp {
  return {
    slug,
    name,
    localPath: null,
    githubRepo: extra.githubRepo ?? null,
    roadmapRepo: WITUS_REPO,
    roadmapPath: `docs/roadmaps/${slug}.md`,
    branch: "main",
    aliases: extra.aliases ?? [],
    productSlug: extra.productSlug,
    note: extra.note,
  };
}

export const ROADMAP_APPS: readonly RoadmapApp[] = [
  // Hub and infrastructure
  inRepo("witus-online", "WitUS", `${AI}/gemini/witus`, "witus-online", {
    aliases: ["witus", "online"],
    productSlug: "witus-online",
  }),
  inRepo("witus-inbox", "WitUS Inbox", `${AI}/claude/witus-inbox`, "witus-inbox", { aliases: ["inbox"], productSlug: "witus-inbox" }),
  inRepo("witus-outbox", "WitUS Outbox", `${AI}/claude/witus-outbox`, "witus-outbox", { aliases: ["outbox"], productSlug: "witus-outbox" }),
  inRepo("shop-witus", "Shop.WitUS", `${AI}/claude/shop-witus`, "shop-witus", { aliases: ["shop"], productSlug: "shop-witus" }),
  inRepo("witus-agent-evals", "WitUS Agent Evals", `${AI}/claude/witus-agent-evals`, "witus-agent-evals", {
    note: "Infrastructure: evals for the LangGraph agents, not a user-facing product.",
  }),

  // Products
  inRepo("centenarianos", "CentenarianOS", `${AI}/gemini/centenarian-os`, "centenarian-os", {
    aliases: ["centenarian-os"],
    productSlug: "centenarianos",
  }),
  inRepo("work-witus", "Work.WitUS", `${AI}/gemini/contractor-os`, "contractor-os", {
    aliases: ["contractor-os", "work"],
    productSlug: "work-witus",
  }),
  inRepo("tour-witus", "Tour Manager OS", `${AI}/gemini/tour-manager-os`, "tour-manager-os", {
    aliases: ["tour-manager-os", "tour"],
    productSlug: "tour-witus",
  }),
  inRepo("wanderlust", "Wanderlust", `${AI}/gemini/wanderlearn/wanderlearn-app`, "wanderlearn-app", {
    aliases: ["wanderlearn-app", "wanderlearn"],
    productSlug: "wanderlust",
    note: "Renamed from Wanderlearn in 2026-08; the repo keeps the old name.",
  }),
  inRepo("wanderlearn-stories", "Wanderlearn Stories", `${AI}/gemini/wanderlearn/wanderlearn-stories`, "wanderlearn-stories", {
    aliases: ["stories"],
    productSlug: "wanderlearn-stories",
  }),
  inRepo("wanderlearn-field-reporter", "Wanderlearn Field Reporter", `${AI}/claude/lang-chain/wanderlearn-field-reporter`, "wanderlearn-field-reporter", {
    aliases: ["field-reporter"],
    productSlug: "wanderlearn-field-reporter",
  }),
  inRepo("fly-witus", "Fly.WitUS", `${AI}/claude/fly-witus`, "fly-witus", { aliases: ["fly"], productSlug: "fly-witus" }),
  inRepo("flashlearnai", "FlashLearnAI", `${AI}/claude/flashlearn-ai`, "flashlearn-ai", {
    aliases: ["flashlearn-ai", "flashlearn"],
    productSlug: "flashlearnai",
  }),
  inRepo("learn-witus", "Learn.WitUS", `${AI}/claude/witus-learn`, "witus-learn", {
    aliases: ["witus-learn", "learn"],
    productSlug: "learn-witus",
  }),
  inRepo("witus-triage-agent", "Triage.Agent.WitUS", `${AI}/claude/lang-chain/witus-triage-agent`, "witus-triage-agent", {
    aliases: ["triage"],
    productSlug: "witus-triage-agent",
  }),
  inRepo("stream-witus", "Stream.WitUS", `${AI}/claude/stream-witus`, "stream-witus", { aliases: ["stream"], productSlug: "stream-witus" }),
  inRepo("centenarian-coach", "Centenarian Coach", `${AI}/claude/lang-chain/centenarian-coach-multiagent`, "centenarian-coach-multiagent", {
    aliases: ["centenarian-coach-multiagent", "coach"],
    productSlug: "centenarian-coach",
  }),
  inRepo("stay-witus", "Stay.WitUS", `${AI}/claude/stay-witus`, "stay-witus", { aliases: ["stay"], productSlug: "stay-witus" }),
  inRepo("realestate-witus", "RealEstate.WitUS", `${AI}/claude/realestate-witus`, "realestate-witus", {
    aliases: ["realestate"],
    productSlug: "realestate-witus",
  }),
  inRepo("create-witus", "Create.WitUS", `${AI}/claude/create-witus`, "create-witus", { aliases: ["create"], productSlug: "create-witus" }),
  inRepo("vogoat", "VO GOAT", `${AI}/claude/vogoat`, "vogoat", { productSlug: "vogoat" }),
  inRepo("invest-witus", "Invest.WitUS", `${AI}/claude/invest-witus`, "invest-witus", { aliases: ["invest"], productSlug: "invest-witus" }),
  inRepo("ride-witus", "RideWitUS", `${AI}/gemini/ride-wit-us`, "ride-wit-us", {
    aliases: ["ride-wit-us", "ride"],
    productSlug: "ride-witus",
  }),

  // Sign-in targets and funnels that are not directory products
  inRepo("bam-landing-page", "Brand Anthony McDonald", `${AI}/claude/bam-landing-page`, "bam-landing-page", {
    aliases: ["bam"],
    note: "brandanthonymcdonald.com. Not projects/bam-portfolio, the retired legacy site.",
  }),
  inRepo("betterbud-ecs", "ECS Specialization course", `${CENT}/bam/ecs-specialization-course-landing-page`, "ecs-specialization-course-landing-page", {
    aliases: ["ecs-specialization-course-landing-page"],
    note: "Course landing page (lead-gen funnel); inbox/outbox source slug betterbud-ecs.",
  }),
  inRepo("fdac", "Fitness Data Analytics Course", `${CENT}/bam/fitness-data-analytics-course-landing-page`, "fitness-data-analytics-course-landing-page", {
    aliases: ["fitness-data-analytics-course-landing-page"],
    note: "Course landing page (lead-gen funnel); inbox/outbox source slug fdac.",
  }),

  // No repo of their own: roadmap lives in this repo under docs/roadmaps/
  inWitus("awesomewebstore", "AwesomeWebStore", {
    productSlug: "awesomewebstore",
    note: "A Shopify store, so there is no code repo to hold a roadmap.",
  }),
  inWitus("anatomy", "Anatomy tool (BioDigital)", {
    note: "Idea: BioDigital Human anatomy tool. CentOS has an admin-only viewer prototype. Not vetted (witus task 103).",
  }),
  inWitus("fit-t-cent-assessments", "Fit T. Cent Assessments", {
    // Read from `git -C /Users/bam/Code_NOiCloud/cent/fit-t-cent-assessments remote get-url origin`.
    githubRepo: `${OWNER}/fit-t-cent-assessments`,
    note: "Idea: phone-camera fitness assessments. The prototype repo exists; the roadmap lives here until it is vetted.",
  }),
];

/** The registry entry for a slug, or undefined. */
export function roadmapAppBySlug(slug: string): RoadmapApp | undefined {
  return ROADMAP_APPS.find((a) => a.slug === slug);
}

/** Every distinct repo the GitHub token must be able to read (task 132). */
export function roadmapTokenRepos(): string[] {
  const repos = new Set<string>();
  for (const a of ROADMAP_APPS) {
    if (a.roadmapRepo) repos.add(a.roadmapRepo);
    if (a.githubRepo) repos.add(a.githubRepo);
  }
  return [...repos].sort();
}
