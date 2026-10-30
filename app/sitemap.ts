import type { MetadataRoute } from "next";
import { SITE_URL, products } from "@/lib/products";
import { alphaProducts, waitlistHref } from "@/lib/waitlist/waitlist.mjs";
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

  // One waitlist page per alpha product; the list changes as products move through alpha.
  const waitlists = alphaProducts(products).map((p) => ({
    url: `${SITE_URL}${waitlistHref(p.slug)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...top, learnIndex, ...learnLeaves, feedback, ...waitlists];
}
