import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "Bio · Learn.WitUS",
  description:
    "Brand Anthony McDonald (BAM). Developer relations specialist, software developer, fitness professional (NASM CPT / CNC / CES), voiceover artist, and MBA.",
  alternates: { canonical: `${SITE_URL}/learn/bio` },
  openGraph: {
    title: "Bio · Brand Anthony McDonald · WitUS",
    description:
      "Developer relations, software, NASM-certified fitness (CPT/CNC/CES), voiceover, MBA. 25+ years in business.",
    url: `${SITE_URL}/learn/bio`,
    images: [
      {
        url: "/og/learn-bio",
        width: 1200,
        height: 630,
        alt: "WitUS. Live Long. Work Free.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bio · Brand Anthony McDonald · WitUS",
    description:
      "Developer relations, software, NASM-certified fitness (CPT/CNC/CES), voiceover, MBA.",
    images: ["/og/learn-bio"],
  },
};

const NASM_ORG = {
  "@type": "Organization",
  name: "National Academy of Sports Medicine",
  url: "https://www.nasm.org",
} as const;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Brand Anthony McDonald",
  alternateName: "BAM",
  url: "https://brandanthonymcdonald.com",
  sameAs: [
    "https://brandanthonymcdonald.com",
    "https://www.linkedin.com/in/brandanthonymcdonald",
    "https://centenarianos.com",
    "https://awesomewebstore.com",
  ],
  jobTitle:
    "Developer Relations specialist, software developer, AI adviser, business consultant, voiceover artist",
  worksFor: {
    "@type": "Organization",
    name: "B4C LLC (dba BAM Sports)",
    url: "https://brandanthonymcdonald.com",
  },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Arizona State University, W. P. Carey School of Business",
  },
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      name: "MBA (Arizona State, W. P. Carey)",
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "CPT (Certified Personal Trainer)",
      url: "http://the.worldsfastestcentenarian.com/nasm-cpt-cert",
      recognizedBy: NASM_ORG,
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "CNC (Certified Nutrition Coach)",
      url: "http://the.worldsfastestcentenarian.com/nasm-cnc-cert",
      recognizedBy: NASM_ORG,
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "CES (Corrective Exercise Specialist)",
      url: "http://the.worldsfastestcentenarian.com/nasm-ces-cert",
      recognizedBy: NASM_ORG,
    },
  ],
  knowsLanguage: ["en", "es"],
};

export default function BioPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link
          href="/learn"
          className="inline-block text-sm text-slate-400 hover:text-white transition-colors mb-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
        >
          &larr; Back to Learn.WitUS
        </Link>

        <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
          Bio
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
          Brand Anthony McDonald
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-2xl">
          Developer relations specialist, software developer, AI adviser, business
          consultant, and voiceover artist. 25+ years in business, multidisciplinary
          by training and by temperament.
        </p>
        <p className="text-slate-400 leading-relaxed mb-12 max-w-2xl">
          Operates through B4C LLC (dba BAM Sports) and AwesomeWebStore.com. Writes,
          codes, teaches, and narrates. &ldquo;Building tools and documenting the
          journey to become the world&rsquo;s fastest centenarian.&rdquo;
        </p>

        <h2 className="text-xl font-bold text-white mb-4">Roles</h2>
        <ul className="space-y-2 mb-12 text-slate-300">
          <li>• Developer relations &amp; technical educator</li>
          <li>• Software developer (FlashLearnAI, Fitness Assessment App, more)</li>
          <li>• AI adviser &amp; business consultant</li>
          <li>• Voiceover artist for audiobooks, commercial, and e-learning narration</li>
          <li>• Content creator across a daily morning show, blog, and curriculum</li>
          <li>• Founder of the WitUS ecosystem</li>
        </ul>

        <h2 className="text-xl font-bold text-white mb-4">Credentials</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-12">
          <div>
            <dt className="text-sm font-semibold text-white">MBA</dt>
            <dd className="text-sm text-slate-400">
              Arizona State University, W. P. Carey School of Business
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-white">CPT</dt>
            <dd className="text-sm text-slate-400">
              Certified Personal Trainer
              <br />
              <a
                href="http://the.worldsfastestcentenarian.com/nasm-cpt-cert"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-teal-300 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
              >
                via National Academy of Sports Medicine (NASM)
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-white">CNC</dt>
            <dd className="text-sm text-slate-400">
              Certified Nutrition Coach
              <br />
              <a
                href="http://the.worldsfastestcentenarian.com/nasm-cnc-cert"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-teal-300 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
              >
                via National Academy of Sports Medicine (NASM)
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-white">CES</dt>
            <dd className="text-sm text-slate-400">
              Corrective Exercise Specialist
              <br />
              <a
                href="http://the.worldsfastestcentenarian.com/nasm-ces-cert"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-teal-300 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
              >
                via National Academy of Sports Medicine (NASM)
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </dd>
          </div>
        </dl>

        <h2 className="text-xl font-bold text-white mb-4">Find BAM</h2>
        <ul className="space-y-2">
          <li>
            <a
              href="https://brandanthonymcdonald.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
            >
              BrandAnthonyMcDonald.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span className="text-slate-400 text-sm"> &middot; full portfolio, services, blog</span>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/brandanthonymcdonald"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
            >
              LinkedIn
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span className="text-slate-400 text-sm"> &middot; professional history</span>
          </li>
          <li>
            <a
              href="mailto:contact@brandanthonymcdonald.com"
              className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
            >
              contact@brandanthonymcdonald.com
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
