import Link from "next/link";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
          WitUS.online
        </p>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          Live Long.
          <br />
          Work Free.
        </h1>
        <p className="text-lg text-slate-400 max-w-xl leading-relaxed mb-8">
          WitUS is a platform built on a single belief: your health and your livelihood
          are not separate goals. We build tools for people who want to own both.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/about"
            className="px-6 py-3 rounded-lg bg-white text-slate-950 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            Read the Philosophy
          </Link>
          <Link
            href="/roadmap"
            className="px-6 py-3 rounded-lg border border-slate-700 text-slate-300 font-semibold text-sm hover:border-slate-500 hover:text-white transition-colors"
          >
            View Roadmap
          </Link>
        </div>
      </section>

      {/* Product Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <p className="text-xs font-semibold tracking-widest text-slate-600 uppercase mb-6">
          The Platform
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <ProductCard
            name="CentenarianOS"
            tagline="The multi-decade personal operating system"
            description="Plan your roadmap, track nutrition, log workouts, analyze your finances, manage travel, and connect it all through cross-module analytics. Your entire life, in one private dashboard."
            href="https://centenarianos.com"
            accentColor="fuchsia"
          />
          <ProductCard
            name="Work.WitUS"
            tagline="Job tracking and business tools for independent contractors"
            description="Create jobs, log time, auto-generate invoices, scan pay stubs with AI, track mileage, and manage your schedule. Built for contractors who work for themselves."
            href="https://work.witus.online"
            accentColor="amber"
          />
        </div>
      </section>

      {/* One Account */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">One account. Two platforms.</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              Your WitUS account works across CentenarianOS and Work.WitUS. Sign up once and
              access both — your health data and your work life, unified under a single login.
            </p>
          </div>
          <Link
            href="/account"
            className="shrink-0 px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-colors"
          >
            Learn more
          </Link>
        </div>
      </section>

      {/* Attribution */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-slate-600 text-sm">
          Built by{" "}
          <a
            href="https://brandanthonymcdonald.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Brand Anthony McDonald
          </a>{" "}
          &mdash; developer advocate, voiceover artist, business consultant, and content creator.
        </p>
      </section>
    </>
  );
}
