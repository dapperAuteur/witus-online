export interface OgEntry {
  title: string;
  subtitle: string;
}

export const ogEntries: Record<string, OgEntry> = {
  home: {
    title: "Live Long. Work Free.",
    subtitle: "Eight WitUS tools. One brand.",
  },
  about: {
    title: "Why WitUS exists.",
    subtitle: "Health and livelihood, one goal from two directions.",
  },
  roadmap: {
    title: "The WitUS roadmap.",
    subtitle: "Shipped, in progress, planned across the ecosystem.",
  },
  account: {
    title: "Your WitUS accounts.",
    subtitle: "Sign-in doors today. Unified account on the roadmap.",
  },
  learn: {
    title: "Learn.WitUS.",
    subtitle: "BAM's practitioner-scholar profile.",
  },
  "learn-bio": {
    title: "Brand Anthony McDonald.",
    subtitle: "Developer relations. Voiceover. NASM-certified fitness. MBA.",
  },
  "learn-curriculum": {
    title: "Better Vice Club.",
    subtitle:
      "Honest relationships with the vices that run everyday life.",
  },
  "learn-research": {
    title: "Research in public.",
    subtitle: "Every WitUS tool is a hypothesis test.",
  },
  "learn-partnerships": {
    title: "Teaching and partnerships.",
    subtitle: "FreeCodeCamp, brand ambassador, institutional.",
  },
  terms: {
    title: "Terms of Service.",
    subtitle: "WitUS platform terms.",
  },
  privacy: {
    title: "Privacy Policy.",
    subtitle: "How WitUS handles your data.",
  },
};

export function pathToSlug(path: string): string {
  if (path === "/" || path === "") return "home";
  return path.replace(/^\//, "").replace(/\//g, "-");
}
