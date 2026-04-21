import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/products";
import { learnSubRoutes } from "@/lib/learn";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const top = [
    "",
    "/about",
    "/explore",
    "/educators",
    "/roadmap",
    "/account",
    "/terms",
    "/privacy",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority:
      path === ""
        ? 1.0
        : path === "/explore" || path === "/educators"
        ? 0.8
        : 0.7,
  }));

  const learnIndex = {
    url: `${SITE_URL}/learn`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  };

  const learnLeaves = learnSubRoutes.map((r) => ({
    url: `${SITE_URL}/learn/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const feedback = {
    url: `${SITE_URL}/educators/feedback`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  };

  return [...top, learnIndex, ...learnLeaves, feedback];
}
