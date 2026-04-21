import type { Metadata } from "next";
import Link from "next/link";
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
      <p className="text-sm font-semibold tracking-widest text-teal-300 uppercase mb-3">
        Better Vice Club
      </p>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
        Twenty-one commodities. One story about geography.
      </h1>
      <p className="text-slate-200 text-lg sm:text-xl leading-relaxed mb-4 max-w-3xl">
        Better Vice Club is a 21-episode{" "}
        <strong className="text-white">curriculum and podcast</strong> about the
        global commodities that run everyday life &mdash; coffee, tea,
        chocolate, sugar, cannabis, coca, and more. Every episode starts with
        where the commodity grows.
      </p>
      <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-3xl">
        The maps below show that geography two ways.{" "}
        <strong className="text-white">Episode Origins</strong> pins each
        commodity at its source.{" "}
        <strong className="text-white">Growing Belts</strong> shows where each
        can grow &mdash; belt colors mix like paint so overlapping regions
        darken where multiple commodities share climate.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-10">
        <Link
          href="/learn/curriculum"
          className="text-teal-300 hover:text-teal-200 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded font-semibold"
        >
          Curriculum details &rarr;
        </Link>
        <span className="text-slate-400">
          Podcast · new episode links shipping with each season drop
        </span>
      </div>

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
          href="/educators"
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
