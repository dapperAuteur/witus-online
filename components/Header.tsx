import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
        >
          WitUS
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-6 text-sm text-slate-400">
          <Link
            href="/about"
            className="hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            About
          </Link>
          <Link
            href="/learn"
            className="hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Learn
          </Link>
          <Link
            href="/roadmap"
            className="hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Roadmap
          </Link>
          <Link
            href="/account"
            className="hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
