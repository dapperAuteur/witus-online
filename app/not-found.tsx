import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — page not found",
  robots: { index: false, follow: false },
};

const SUGGESTIONS: Array<{ href: string; label: string; hint: string }> = [
  { href: "/", label: "Home", hint: "ecosystem overview" },
  { href: "/learn", label: "Learn WitUS", hint: "curriculum + research" },
  { href: "/explore", label: "Explore", hint: "interactive maps" },
  { href: "/educators", label: "Educators", hint: "BVC pilot signup" },
  { href: "/about", label: "About", hint: "WitUS story" },
  { href: "/roadmap", label: "Roadmap", hint: "what we're building next" },
];

export default function NotFound() {
  return (
    <section
      role="region"
      aria-labelledby="nf-heading"
      className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-4 py-16"
    >
      <p
        aria-hidden="true"
        className="font-mono text-xs tracking-[0.3em] text-teal-300"
      >
        404
      </p>
      <h1
        id="nf-heading"
        className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
      >
        That page isn&rsquo;t here.
      </h1>
      <p className="max-w-prose text-base text-slate-400">
        The link you followed is stale, the URL got mis-typed, or the page
        retired. Nothing on your end is broken — pick a destination below or
        head back where you came from.
      </p>

      <nav aria-label="Suggested pages" className="w-full">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 hover:border-teal-400 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
              >
                <span className="text-sm font-semibold text-slate-100">
                  {item.label}
                </span>
                <span className="text-xs text-slate-500">{item.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-xs text-slate-500">
        Convinced this URL used to work?{" "}
        <Link
          href="/educators/feedback"
          className="underline underline-offset-4 hover:text-teal-300"
        >
          Tell us
        </Link>{" "}
        — we&rsquo;ll fix the link or add a redirect.
      </p>
    </section>
  );
}
