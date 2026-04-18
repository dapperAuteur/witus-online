import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "Partnerships · Learn.WitUS",
  description:
    "Community leadership, teaching roles, and institutional collaborations. FreeCodeCamp, BAM Sports clients, brand-ambassador engagements, and venue partners.",
  alternates: { canonical: `${SITE_URL}/learn/partnerships` },
  openGraph: {
    title: "Partnerships · Learn.WitUS",
    description:
      "Community leadership, teaching, and institutional collaborations.",
    url: `${SITE_URL}/learn/partnerships`,
    images: [
      {
        url: "/og/learn-partnerships",
        width: 1200,
        height: 630,
        alt: "WitUS. Live Long. Work Free.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Partnerships · Learn.WitUS",
    description:
      "Community leadership, teaching, and institutional collaborations.",
    images: ["/og/learn-partnerships"],
  },
};

export default function PartnershipsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <Link
        href="/learn"
        className="inline-block text-sm text-slate-400 hover:text-white transition-colors mb-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
      >
        &larr; Back to Learn.WitUS
      </Link>

      <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
        Partnerships
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
        Teaching, community, collaboration.
      </h1>
      <p className="text-slate-300 text-lg leading-relaxed mb-12 max-w-2xl">
        Learn.WitUS is not a solo project. BAM&rsquo;s work moves through
        communities, clients, and institutional partners. The WitUS ecosystem is
        shaped by those collaborations.
      </p>

      <h2 className="text-xl font-bold text-white mb-4">Community &amp; teaching</h2>
      <ul className="space-y-6 mb-12">
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            FreeCodeCamp
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Community leader and technical educator across San Francisco,
            Phoenix, and Indianapolis chapters. Supported 100+ developers
            through technical challenges, founded the &ldquo;Teach What You
            Know&rdquo; series, ran weekly pair-programming sessions, and
            developed JavaScript / full-stack curriculum.
          </p>
        </li>
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            Brand Ambassador engagements
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ongoing product demonstration, workshop hosting, and event
            coordination for various client brands. Typically 10&ndash;25 person
            audiences, multiple events per month.
          </p>
        </li>
      </ul>

      <h2 className="text-xl font-bold text-white mb-4">Institutional</h2>
      <ul className="space-y-6 mb-12">
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            BAM Sports / B4C LLC clients
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Fitness, consulting, and voiceover work under the B4C LLC legal
            entity. Every product in the WitUS ecosystem is operated through
            this shell.
          </p>
        </li>
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            Venue &amp; contracting network
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Work.WitUS maintains a venue knowledge base that grows with each
            contracted job. A standing resource for independent contractors
            working similar rooms.
          </p>
        </li>
      </ul>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-base font-semibold text-white mb-2">
          Want to partner?
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          Teaching engagements, curriculum licensing, research collaborations,
          and ambassador work are all on the table.
        </p>
        <a
          href="mailto:contact@brandanthonymcdonald.com"
          className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          Email BAM
          <span aria-hidden="true" className="ml-2">
            &rarr;
          </span>
        </a>
      </div>
    </div>
  );
}
