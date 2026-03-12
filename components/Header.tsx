import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          WitUS
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-400">
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <Link href="/roadmap" className="hover:text-white transition-colors">
            Roadmap
          </Link>
          <Link href="/account" className="hover:text-white transition-colors">
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
