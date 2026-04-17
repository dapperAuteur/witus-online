import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/products";
import { learnSubRoutes } from "@/lib/learn";

export const metadata: Metadata = {
  title: "Learn.WitUS",
  description:
    "BAM's practitioner-scholar profile. Bio, BVC curriculum, research, and education partnerships behind the WitUS ecosystem.",
  alternates: { canonical: `${SITE_URL}/learn` },
  openGraph: {
    title: "Learn.WitUS · WitUS",
    description:
      "BAM's practitioner-scholar profile. Bio, BVC curriculum, research, and education partnerships.",
    url: `${SITE_URL}/learn`,
    images: [
      {
        url: "/og/home.png",
        width: 1200,
        height: 630,
        alt: "WitUS. Live Long. Work Free.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn.WitUS · WitUS",
    description:
      "BAM's practitioner-scholar profile. Bio, BVC curriculum, research, partnerships.",
    images: ["/og/home.png"],
  },
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Learn.WitUS",
  url: `${SITE_URL}/learn`,
  description:
    "BAM's practitioner-scholar profile. Bio, BVC curriculum, research, and education partnerships.",
  hasPart: learnSubRoutes.map((r) => ({
    "@type": "WebPage",
    name: r.name,
    url: `${SITE_URL}/learn/${r.slug}`,
    description: r.description,
  })),
};

export default function LearnIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
          Learn.WitUS
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
          The practitioner-scholar profile behind WitUS.
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-2xl">
          Brand Anthony McDonald (BAM) builds tools and documents the journey to
          become the world's fastest centenarian. The WitUS ecosystem is the
          platform he builds on. This section is the teaching layer behind it.
        </p>
        <p className="text-slate-400 leading-relaxed mb-12 max-w-2xl">
          Twenty-five years in business, spanning developer relations, fitness
          education, voiceover, AI advising, and multidisciplinary consulting.
          Based in San Francisco. Operating through B4C LLC (dba BAM Sports) and
          AwesomeWebStore.com.
        </p>

        <h2
          id="sub-routes-heading"
          className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4"
        >
          Sections
        </h2>
        <div
          aria-labelledby="sub-routes-heading"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16"
        >
          {learnSubRoutes.map((route) => (
            <Link
              key={route.slug}
              href={`/learn/${route.slug}`}
              className="flex flex-col min-h-11 p-6 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-600 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="text-base font-semibold text-white mb-2">
                {route.name}
              </span>
              <span className="text-sm text-slate-400 leading-relaxed">
                {route.description}
              </span>
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-2">
            Courses live on the Academy.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-xl">
            Learn.WitUS is the profile. Actual courses (Better Vice Club,
            Foundations of Fitness, Intervention Design) are delivered through
            the Centenarian Academy LMS.
          </p>
          <a
            href="https://centenarianos.com/academy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            Open the Academy
            <span aria-hidden="true" className="ml-2">
              &rarr;
            </span>
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
      </div>
    </>
  );
}
