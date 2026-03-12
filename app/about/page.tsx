import type { Metadata } from "next";
import ManifestoSection from "@/components/ManifestoSection";

export const metadata: Metadata = {
  title: "About — WitUS",
  description: "The philosophy behind WitUS: why longevity and independent work belong together.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
        About WitUS
      </p>
      <h1 className="text-4xl font-extrabold text-white mb-8 leading-tight">
        Why we built this
      </h1>

      <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed space-y-6">
        <p>
          Most productivity tools are built around a single dimension of your life. It may be your work,
          your health, or your money. You end up juggling five apps that don&apos;t talk to each
          other, and none of them understand the big picture.
        </p>
        <p>
          WitUS started from a different premise: the people most worth building for are the ones
          who refuse to separate their ambitions. The contractor who logs time and tracks nutrition.
          The creator who invoices clients and plans their decade. The independent professional who
          understands that a long, healthy life is the ultimate ROI.
        </p>
      </div>

      <ManifestoSection
        quote="Your health and your livelihood are not separate goals. They are the same goal, approached from two directions."
      />

      <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed space-y-6">
        <p>
          That philosophy became two products. <strong className="text-white">CentenarianOS</strong>{" "}
          is a multi-decade personal operating system. CentenarianOS covers nutrition, fitness, focus, finance,
          travel, and planning in one integrated, private dashboard. It&apos;s for people who think
          in decades, not days.
        </p>
        <p>
          <strong className="text-white">Work.WitUS</strong> is a contractor management platform
          for independent workers. Work.WitUS allows job tracking, time logging, invoice generation, document
          scanning, and more. It&apos;s for people who work for themselves and want to run their
          work life as professionally as possible.
        </p>
        <p>
          Both apps share a single account. Because the person who uses them is one person.
        </p>
      </div>

      {/* BAM Section */}
      <div className="mt-16 pt-10 border-t border-slate-800">
        <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
          The Builder
        </p>
        <h2 className="text-2xl font-bold text-white mb-4">Brand Anthony McDonald</h2>
        <p className="text-slate-400 leading-relaxed mb-4">
          BAM is a developer advocate, voiceover artist, business consultant, and content creator
          based in Indianapolis, Indiana. He built WitUS to solve his own problems with tracking
          contractor work while staying intentional about health and longevity.
        </p>
        <p className="text-slate-400 leading-relaxed mb-6">
          WitUS is a B4C LLC / AwesomeWebStore.com product. It sits at the top of an ecosystem that
          includes both apps and BAM&apos;s personal portfolio of writing, teaching, and advocacy work.
        </p>
        <a
          href="https://brandanthonymcdonald.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-slate-300 hover:text-white transition-colors border-b border-slate-700 hover:border-slate-400 pb-0.5"
        >
          Visit BAM&apos;s site &rarr;
        </a>
      </div>
    </div>
  );
}
