import type { Metadata } from "next";
import FaviconSwitcher from "./FaviconSwitcher";

export const metadata: Metadata = {
  title: "Logo options — internal preview",
  description: "Side-by-side review of three WitUS logo + favicon directions.",
  robots: { index: false, follow: false },
};

type Option = {
  slug: string;
  title: string;
  summary: string;
};

const OPTIONS: Option[] = [
  {
    slug: "01-orbit",
    title: "Option 1 — Orbit mark",
    summary:
      "Core + 8 satellite dots in product accent colors. Tells the ecosystem story literally. Favicon simplifies to core + 4 compass-point dots.",
  },
  {
    slug: "02-duality",
    title: "Option 2 — Duality W",
    summary:
      "A W built from two diagonals (Live in fuchsia, Work in amber) meeting at a white center pillar. Encodes 'Live Long. Work Free.'",
  },
  {
    slug: "03-type-dot",
    title: "Option 3 — Type + dot",
    summary:
      'A "WitUS" wordmark with a neutral dot trailing the S. Monogram "W." at favicon size. Minimal, modern, safe.',
  },
  {
    slug: "04-orbit-type",
    title: "Option 4 — Orbit + W hybrid",
    summary:
      "Bold W centered inside 8 satellite dots in the product accent colors. Merges Option 1's ecosystem story with Option 3's type-first legibility. Favicon keeps the W + 4 compass dots.",
  },
];

const ACCENT_SWATCHES: { name: string; className: string; isLight?: boolean }[] = [
  { name: "slate", className: "bg-slate-950" },
  { name: "fuchsia", className: "bg-fuchsia-500" },
  { name: "amber", className: "bg-amber-500" },
  { name: "violet", className: "bg-violet-500" },
  { name: "sky", className: "bg-sky-500" },
  { name: "emerald", className: "bg-emerald-500" },
  { name: "rose", className: "bg-rose-500" },
  { name: "teal", className: "bg-teal-500" },
  { name: "lime", className: "bg-lime-500" },
  { name: "white", className: "bg-white", isLight: true },
];

const LOGO_SIZES = [16, 32, 64, 128, 256];

export default function LogoPreviewPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
        Internal review
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
        Logo + favicon options
      </h1>
      <p className="text-slate-400 leading-relaxed mb-8 max-w-2xl">
        Three distinct directions, each with a logomark, wordmark, favicon set, and
        accent-neutrality test. Pick one and the other two get deleted in a follow-up
        plan.
      </p>

      <FaviconSwitcher />

      {OPTIONS.map((option) => (
        <section
          key={option.slug}
          aria-labelledby={`${option.slug}-heading`}
          className="mb-16 pb-16 border-b border-slate-800 last:border-0"
        >
          <h2
            id={`${option.slug}-heading`}
            className="text-2xl font-bold text-white mb-2"
          >
            {option.title}
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl">{option.summary}</p>

          {/* Size ladder */}
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">
            Logomark — size ladder
          </h3>
          <div className="flex flex-wrap items-end gap-6 mb-10">
            {LOGO_SIZES.map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/brand/${option.slug}/logomark.svg`}
                  alt=""
                  width={size}
                  height={size}
                  style={{ width: size, height: size }}
                  className="block"
                />
                <span className="text-[10px] text-slate-500">{size}px</span>
              </div>
            ))}
          </div>

          {/* Wordmark in header context */}
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">
            Wordmark — header context
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/brand/${option.slug}/wordmark.svg`}
              alt={`${option.title} wordmark`}
              height={36}
              style={{ height: 36, width: "auto" }}
            />
            <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
              <span>About</span>
              <span>Learn</span>
              <span>Roadmap</span>
              <span>Account</span>
            </nav>
          </div>

          {/* Favicon in simulated browser tab */}
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">
            Favicon — simulated browser tab
          </h3>
          <div className="rounded-t-xl bg-slate-800/80 p-3 flex gap-2 items-center max-w-md mb-10">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" aria-hidden="true"/>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true"/>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" aria-hidden="true"/>
            <div className="flex-1 ml-2 rounded-t-lg bg-slate-700 px-3 py-1.5 flex items-center gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/brand/${option.slug}/favicon-16.png`}
                alt=""
                width={16}
                height={16}
                className="block shrink-0"
              />
              <span className="text-xs text-slate-200 truncate">
                WitUS — Live Long. Work Free.
              </span>
            </div>
          </div>

          {/* Accent neutrality grid */}
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">
            Accent neutrality — logomark on every product accent
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-2">
            {ACCENT_SWATCHES.map((sw) => (
              <div
                key={sw.name}
                className={`rounded-lg ${sw.className} aspect-square flex flex-col items-center justify-center gap-2 p-3`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/brand/${option.slug}/logomark.svg`}
                  alt=""
                  width={48}
                  height={48}
                  className="block"
                />
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    sw.isLight ? "text-slate-700" : "text-white/80"
                  }`}
                >
                  {sw.name}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Look for: does the mark stay legible and recognizably WitUS on every
            product accent? Anywhere it clashes disqualifies the option.
          </p>
        </section>
      ))}

      <p className="text-sm text-slate-500">
        When you pick a winner, the losers get deleted and the choice gets promoted
        to <code className="text-slate-300">plans/future/favicon-and-logo.md</code> for
        a follow-up rollout plan.
      </p>
    </div>
  );
}
