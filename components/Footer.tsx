import Link from "next/link";
import { products } from "@/lib/products";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-24">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:justify-between gap-10 text-sm text-slate-500">
        <div>
          <p className="font-semibold text-slate-300 mb-1">WitUS.online</p>
          <p>A B4C LLC / AwesomeWebStore.com brand</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 w-full sm:w-auto">
          <div>
            <p className="text-slate-400 font-medium mb-2">Products</p>
            <ul className="space-y-1">
              {products.map((product) =>
                product.status === "coming-soon" ? (
                  <li key={product.slug} className="text-slate-600">
                    {product.name}
                  </li>
                ) : (
                  <li key={product.slug}>
                    <a
                      href={product.href}
                      target={product.external ? "_blank" : undefined}
                      rel={product.external ? "noopener noreferrer" : undefined}
                      className="hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
                    >
                      {product.name}
                      {product.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </a>
                  </li>
                )
              )}
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
