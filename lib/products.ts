export type ProductStatus = "live" | "beta" | "coming-soon";

export type Accent =
  | "amber"
  | "fuchsia"
  | "violet"
  | "sky"
  | "emerald"
  | "rose"
  | "teal"
  | "lime";

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
}

export const SITE_URL = "https://witus.online";

export const products: Product[] = [
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
  },
];
