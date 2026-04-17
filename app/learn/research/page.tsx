import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "Research · Learn.WitUS",
  description:
    "Ongoing inquiry at the intersection of longevity, software, fitness data, and behavior change. BAM's multidisciplinary research anchored in the WitUS ecosystem.",
  alternates: { canonical: `${SITE_URL}/learn/research` },
  openGraph: {
    title: "Research · Learn.WitUS",
    description:
      "Inquiry at the intersection of longevity, software, fitness data, and behavior change.",
    url: `${SITE_URL}/learn/research`,
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
    title: "Research · Learn.WitUS",
    description:
      "Inquiry at the intersection of longevity, software, fitness, and behavior.",
    images: ["/og/home.png"],
  },
};

export default function ResearchPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <Link
        href="/learn"
        className="inline-block text-sm text-slate-400 hover:text-white transition-colors mb-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
      >
        &larr; Back to Learn.WitUS
      </Link>

      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
        Research
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
        Practitioner inquiry, in public.
      </h1>
      <p className="text-slate-300 text-lg leading-relaxed mb-12 max-w-2xl">
        Every tool in the WitUS ecosystem is a hypothesis test. BAM documents the
        work openly so the research can compound across the stack.
      </p>

      <h2 className="text-xl font-bold text-white mb-4">Areas of inquiry</h2>
      <ul className="space-y-6 mb-12">
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            Cross-module correlations
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            What happens when you let sleep, training, nutrition, finance, and
            focus data sit in the same schema? CentenarianOS&rsquo;s cross-module
            analytics is the instrument.
          </p>
        </li>
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            Fitness assessment &amp; intervention design
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Anchored in BAM&rsquo;s CPT / CNC / CES credentials. The Fitness
            Assessment App and CentenarianOS&rsquo;s Workouts &amp; Exercises module
            are its lab.
          </p>
        </li>
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            Spaced repetition for practitioner skills
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            FlashLearnAI is the test-bed: can spaced recall move professional
            knowledge (not just vocabulary) into long-term memory?
          </p>
        </li>
        <li className="border-l-2 border-teal-500/40 pl-4">
          <h3 className="text-base font-semibold text-white mb-1">
            Independent-contractor economics
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Work.WitUS doubles as a dataset for how time, mileage, invoicing,
            and venue knowledge interact in modern freelance work.
          </p>
        </li>
      </ul>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-base font-semibold text-white mb-2">
          Working notes live on the blog.
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          70+ articles across technology, education, fitness, and related
          research threads. The blog is where the thinking-out-loud happens.
        </p>
        <a
          href="https://brandanthonymcdonald.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg border border-slate-700 text-slate-200 text-sm font-semibold hover:border-slate-500 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Read the blog
          <span aria-hidden="true" className="ml-2">
            &rarr;
          </span>
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      </div>
    </div>
  );
}
