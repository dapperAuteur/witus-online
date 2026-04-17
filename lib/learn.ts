export interface LearnSubRoute {
  slug: "bio" | "curriculum" | "research" | "partnerships";
  name: string;
  description: string;
}

export const learnSubRoutes: readonly LearnSubRoute[] = [
  {
    slug: "bio",
    name: "Bio",
    description:
      "BAM's practitioner-scholar background. Developer relations, fitness credentials, voiceover, MBA.",
  },
  {
    slug: "curriculum",
    name: "BVC Curriculum",
    description:
      "The curriculum framework BAM teaches through. Covers Foundations of Fitness, Intervention Design, and more.",
  },
  {
    slug: "research",
    name: "Research",
    description:
      "Ongoing inquiry at the intersection of longevity, software, and fitness data.",
  },
  {
    slug: "partnerships",
    name: "Partnerships",
    description:
      "Community leadership, teaching roles, and institutional collaborations.",
  },
] as const;
