import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products, SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "WitUS. Live Long. Work Free.",
  description:
    "The WitUS ecosystem: 8 tools for health, livelihood, learning, and flight. One brand, one philosophy.",
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: "WitUS. Live Long. Work Free.",
    description:
      "8 tools for health, livelihood, learning, and flight.",
    url: `${SITE_URL}/`,
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
    title: "WitUS. Live Long. Work Free.",
    description:
      "8 tools for health, livelihood, learning, and flight.",
    images: ["/og/home.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "WitUS",
  url: SITE_URL,
  logo: `${SITE_URL}/flywitus-platypus-logo.png`,
  sameAs: [
    "https://brandanthonymcdonald.com",
    "https://awesomewebstore.com",
  ],
};

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: products.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: product.href,
    name: product.name,
    description: product.tagline,
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
          WitUS.online
        </p>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          Live Long.
          <br />
          Work Free.
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed mb-8">
          WitUS is a platform built on a single belief: your health and your livelihood
          are not separate goals. We build tools for people who want to own both.
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <Link
            href="/about"
            className="min-h-11 inline-flex items-center px-6 py-3 rounded-lg bg-white text-slate-950 font-semibold text-sm hover:bg-slate-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Read the Philosophy
          </Link>
          <Link
            href="/roadmap"
            className="min-h-11 inline-flex items-center px-6 py-3 rounded-lg border border-slate-700 text-slate-300 font-semibold text-sm hover:border-slate-500 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            View Roadmap
          </Link>
        </div>
      </section>

      {/* Product Directory */}
      <section
        aria-labelledby="products-heading"
        className="max-w-5xl mx-auto px-6 pb-20"
      >
        <h2
          id="products-heading"
          className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-6"
        >
          The Platform
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.slug}
              name={product.name}
              tagline={product.tagline}
              description={product.description}
              href={product.href}
              accentColor={product.accent}
              status={product.status}
              external={product.external}
            />
          ))}
        </div>
      </section>

      {/* One Account: roadmap framing, honest about today */}
      <section
        aria-labelledby="one-account-heading"
        className="border-y border-slate-800 bg-slate-900/40"
      >
        <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <span className="inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 mb-3">
              On the roadmap
            </span>
            <h2
              id="one-account-heading"
              className="text-xl font-bold text-white mb-2"
            >
              One WitUS account. Coming soon.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              Today, each WitUS tool has its own sign-in. A unified WitUS account,
              one login across the whole ecosystem, is on the roadmap. When it
              ships, your existing accounts migrate in.
            </p>
          </div>
          <Link
            href="/account"
            className="shrink-0 min-h-11 inline-flex items-center px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign-in doors
          </Link>
        </div>
      </section>

      {/* Attribution */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-slate-400 text-sm">
          Built by{" "}
          <a
            href="https://brandanthonymcdonald.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-slate-200 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Brand Anthony McDonald
          </a>
          , developer advocate, voiceover artist, business consultant, and content creator.
          <span className="sr-only"> (opens in new tab)</span>
        </p>
      </section>
    </>
  );
}
