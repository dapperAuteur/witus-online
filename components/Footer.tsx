import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-24">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-sm text-slate-500">
        <div>
          <p className="font-semibold text-slate-300 mb-1">WitUS.online</p>
          <p>A B4C LLC / AwesomeWebStore.com brand</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
          <div>
            <p className="text-slate-400 font-medium mb-2">Products</p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://centenarianos.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  CentenarianOS
                </a>
              </li>
              <li>
                <a
                  href="https://work.witus.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Work.WitUS
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-slate-400 font-medium mb-2">WitUS</p>
            <ul className="space-y-1">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="hover:text-white transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-white transition-colors">
                  Account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-slate-400 font-medium mb-2">Legal</p>
            <ul className="space-y-1">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
