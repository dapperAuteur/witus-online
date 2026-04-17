import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="WitUS home"
          className="inline-flex items-center focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/04-orbit-type/wordmark.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-auto block"
          />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3 text-sm text-slate-300">
          <Link
            href="/about"
            className="inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            About
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Learn
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Roadmap
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
