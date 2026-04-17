import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "BVC Curriculum · Learn.WitUS",
  description:
    "The curriculum framework BAM teaches through. Foundations of Fitness, Intervention Design, and the broader BVC program. Courses delivered on the Centenarian Academy LMS.",
  alternates: { canonical: `${SITE_URL}/learn/curriculum` },
  openGraph: {
    title: "BVC Curriculum · Learn.WitUS",
    description:
      "Foundations of Fitness, Intervention Design, and the broader BVC curriculum.",
    url: `${SITE_URL}/learn/curriculum`,
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
    title: "BVC Curriculum · Learn.WitUS",
    description: "BAM's curriculum framework, delivered through the Academy.",
    images: ["/og/home.png"],
  },
};

export default function CurriculumPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <Link
        href="/learn"
        className="inline-block text-sm text-slate-400 hover:text-white transition-colors mb-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
      >
        &larr; Back to Learn.WitUS
      </Link>

      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
        Curriculum
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
        BVC Curriculum
      </h1>
      <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-2xl">
        BVC is BAM&rsquo;s practitioner-scholar curriculum framework. It&rsquo;s
        the lens through which BAM teaches fitness, longevity, and intervention
        design across the WitUS ecosystem.
      </p>
      <p className="text-slate-400 leading-relaxed mb-12 max-w-2xl">
        Learn.WitUS is the profile and map. Actual courses live on the
        Centenarian Academy LMS, where they can be enrolled in, completed, and
        tracked like any other course.
      </p>

      <h2 className="text-xl font-bold text-white mb-4">Named curricula</h2>
      <div className="space-y-6 mb-12">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white mb-2">
            Foundations of Fitness
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            First-principles fitness education grounded in BAM&rsquo;s CPT / CNC /
            CES credentials. Built for learners who want to understand the
            &ldquo;why&rdquo; behind training, nutrition, and recovery, not just the
            &ldquo;what.&rdquo;
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white mb-2">
            Intervention Design
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            How to design behavioral and physical interventions that actually
            stick. Draws on BAM&rsquo;s consulting work across developer relations,
            corrective exercise, and corporate training.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white mb-2">
            BVC core
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            The overarching framework these named curricula slot into. Detailed
            module breakdown is authored on brandanthonymcdonald.com and in the
            Academy.
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Expanded content coming from BAM
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Where to learn</h2>
      <a
        href="https://centenarianos.com/academy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
      >
        Open the Centenarian Academy
        <span aria-hidden="true" className="ml-2">
          &rarr;
        </span>
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}
