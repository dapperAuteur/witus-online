import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are offline. Previously viewed WitUS pages are still available.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 sm:py-20">
      <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
        No connection
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
        You are offline.
      </h1>
      <p className="text-slate-300 text-lg leading-relaxed mb-4">
        The page you tried to open is not in this device&rsquo;s cache and cannot
        be fetched right now.
      </p>
      <p className="text-slate-400 leading-relaxed mb-10">
        Pages you have already visited on this device will still load. When you
        are back online, every page will be available again.
      </p>

      <h2 className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">
        Try one of these
      </h2>
      <ul className="space-y-2 mb-10">
        <li>
          <Link
            href="/"
            className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/about"
            className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
          >
            About
          </Link>
        </li>
        <li>
          <Link
            href="/learn"
            className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
          >
            Learn.WitUS
          </Link>
        </li>
        <li>
          <Link
            href="/roadmap"
            className="text-teal-300 hover:text-teal-200 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
          >
            Roadmap
          </Link>
        </li>
      </ul>

      <p className="text-sm text-slate-400">
        If a cached page still won&rsquo;t open, reload once your network is back.
      </p>
    </div>
  );
}
