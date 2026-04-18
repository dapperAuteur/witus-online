import type { Metadata } from "next";
import HomepageMapSection from "@/components/HomepageMapSection";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Better Vice Club on a world map. 21 episodes across 3 seasons, plotted by geographic origin. Click any pin to see where the episode lives and what it covers across Geography, Social Studies, Economics, and ELA.",
  alternates: { canonical: `${SITE_URL}/explore` },
  openGraph: {
    title: "Explore · WitUS",
    description:
      "Every Better Vice Club episode on a world map. Click any pin to see the curriculum.",
    url: `${SITE_URL}/explore`,
    images: [
      {
        url: "/og/explore",
        width: 1200,
        height: 630,
        alt: "The world is your classroom.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore · WitUS",
    description:
      "Every Better Vice Club episode on a world map. Click any pin to see the curriculum.",
    images: ["/og/explore"],
  },
};

export default function ExplorePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">
        21 episodes · 3 seasons · 4 subjects
      </p>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
        The world is your classroom.
      </h1>
      <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-2xl">
        Two views of the same curriculum. <strong className="text-white">Episode
        Origins</strong> plots all 21 commodities by geographic source.{" "}
        <strong className="text-white">Growing Belts</strong> shows where each
        commodity can grow; belt colors mix like paint, so overlapping
        latitudes darken where multiple commodities share climate.
      </p>

      <HomepageMapSection />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
        <a
          href="https://centenarianos.com/academy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col min-h-11 p-6 rounded-xl border border-teal-500/30 hover:border-teal-500/60 bg-slate-900/50 transition-colors group focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          <span className="text-xs font-semibold tracking-widest text-teal-300 uppercase mb-2">
            Start learning free
          </span>
          <span className="text-lg font-semibold text-white mb-2">
            Browse the full BVC curriculum
          </span>
          <span className="text-sm text-slate-400 leading-relaxed">
            All 21 episodes. Subject-specific teacher packets. Aligned to
            Indiana Academic Standards for grades 9 to 12. Free to start.
            <span className="sr-only"> (opens in new tab)</span>
          </span>
        </a>
        <a
          href="/learn/partnerships"
          className="flex flex-col min-h-11 p-6 rounded-xl border border-fuchsia-500/30 hover:border-fuchsia-500/60 bg-slate-900/50 transition-colors group focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
        >
          <span className="text-xs font-semibold tracking-widest text-fuchsia-300 uppercase mb-2">
            Pilot it in your classroom
          </span>
          <span className="text-lg font-semibold text-white mb-2">
            Curriculum consultant program
          </span>
          <span className="text-sm text-slate-400 leading-relaxed">
            Looking for Geography, Social Studies, Economics, and ELA teachers
            to review the materials and provide structured feedback. Free
            curriculum in exchange.
          </span>
        </a>
      </div>
    </div>
  );
}
