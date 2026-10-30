import Link from "next/link";
import { HeaderAuth } from "@/components/HeaderAuth";
import { HeaderMenu } from "@/components/HeaderMenu";
import { sectionLinks } from "@/components/headerLinks";

export default function Header() {
  return (
    <header className="relative border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2 sm:gap-4">
        <Link
          href="/"
          aria-label="WitUS home"
          className="inline-flex shrink-0 items-center focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/04-orbit-type/wordmark.svg"
            alt=""
            aria-hidden="true"
            className="h-6 sm:h-7 w-auto block"
          />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-0 sm:gap-3 text-sm text-slate-300">
          {sectionLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden sm:inline-flex items-center min-h-11 px-3 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
            >
              {l.label}
            </Link>
          ))}
          <HeaderAuth />
          <HeaderMenu />
        </nav>
      </div>
    </header>
  );
}
