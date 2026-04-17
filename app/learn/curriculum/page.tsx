import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "BVC Curriculum · Learn.WitUS",
  description:
    "Better Vice Club (BVC). BAM's curriculum for getting honest with human vices (coffee, sugar, alcohol, and more) and designing interventions that actually stick. Delivered on the Centenarian Academy LMS.",
  alternates: { canonical: `${SITE_URL}/learn/curriculum` },
  openGraph: {
    title: "BVC Curriculum · Learn.WitUS",
    description:
      "Better Vice Club. Honest relationships with coffee, sugar, alcohol, and the other vices that run everyday life.",
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
    description:
      "Better Vice Club. Honest relationships with the vices that run everyday life.",
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

      <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
        Curriculum
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
        Better Vice Club
      </h1>
      <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-2xl">
        BVC stands for <strong className="text-white">Better Vice Club</strong>.
        It is BAM&rsquo;s curriculum for getting honest with the human vices that
        run everyday life. Coffee, sugar, alcohol, screens, and the rest.
      </p>
      <p className="text-slate-400 leading-relaxed mb-6 max-w-2xl">
        The premise: most people either pretend their vices don&rsquo;t cost them
        anything, or quit cold turkey and relapse. BVC teaches a third path.
        Keep the ones that earn their place, retire the ones that don&rsquo;t,
        and design interventions around the ones in between.
      </p>
      <p className="text-slate-400 leading-relaxed mb-12 max-w-2xl">
        Learn.WitUS is the profile and the map. The courses themselves live on
        the Centenarian Academy LMS, where enrollment, progress, and cohorts are
        tracked.
      </p>

      <h2 className="text-xl font-bold text-white mb-4">The BVC stance</h2>
      <ul className="space-y-3 mb-12 text-slate-300">
        <li className="flex gap-3">
          <span className="text-teal-400" aria-hidden="true">1.</span>
          <span>
            Every vice has a real cost and a real reason. Naming both is the
            starting point.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-teal-400" aria-hidden="true">2.</span>
          <span>
            Abstinence is a tool, not a virtue. So is moderation. So is
            elimination. Pick the tool that fits the vice.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-teal-400" aria-hidden="true">3.</span>
          <span>
            Interventions that survive contact with ordinary life are the only
            ones worth running. Design for Tuesday, not New Year&rsquo;s Day.
          </span>
        </li>
      </ul>

      <h2 className="text-xl font-bold text-white mb-4">Named curricula</h2>
      <div className="space-y-6 mb-12">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white mb-2">
            Better Vice Club core
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            The flagship program. Audit the vices that run your week, decide
            which ones earn their place, and design the interventions. Coffee,
            sugar, alcohol, screens, shopping, and the quiet ones nobody talks
            about.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white mb-2">
            Foundations of Fitness
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            First-principles fitness education grounded in BAM&rsquo;s CPT, CNC,
            and CES credentials. The training, nutrition, and recovery substrate
            that makes BVC&rsquo;s interventions stick.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white mb-2">
            Intervention Design
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            How to design behavioral and physical interventions that actually
            hold up. Draws on BAM&rsquo;s consulting work across developer
            relations, corrective exercise, and corporate training.
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
