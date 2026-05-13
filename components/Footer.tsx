import Link from "next/link";
import { products } from "@/lib/products";
import { learnSubRoutes } from "@/lib/learn";

const linkClasses =
  "inline-flex items-center min-h-[32px] py-1 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-24">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:justify-between gap-10 text-sm text-slate-300">
        <div>
          <p className="font-semibold text-white mb-1">WitUS.online</p>
          <p>
            A B4C LLC /{" "}
            <a
              href="https://awesomewebstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
            >
              AwesomeWebStore.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>{" "}
            brand
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 w-full sm:w-auto">
          <div>
            <p className="text-white font-medium mb-2">Products</p>
            <ul className="space-y-1">
              {products
                .filter((p) => p.status !== "infrastructure")
                .map((product) =>
                  product.status === "coming-soon" ? (
                    <li key={product.slug} className="text-slate-400 italic">
                      {product.name}
                    </li>
                  ) : (
                    <li key={product.slug}>
                      <a
                        href={product.href}
                        target={product.external ? "_blank" : undefined}
                        rel={
                          product.external ? "noopener noreferrer" : undefined
                        }
                        className={linkClasses}
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
            <p className="text-white font-medium mt-4 mb-2">Infrastructure</p>
            <ul className="space-y-1">
              {products
                .filter((p) => p.status === "infrastructure")
                .map((product) => (
                  <li key={product.slug}>
                    <a
                      href={product.href}
                      target={product.external ? "_blank" : undefined}
                      rel={
                        product.external ? "noopener noreferrer" : undefined
                      }
                      className={linkClasses}
                    >
                      {product.name}
                      {product.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-medium mb-2">WitUS</p>
            <ul className="space-y-1">
              <li>
                <Link href="/about" className={linkClasses}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className={linkClasses}>
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="/account" className={linkClasses}>
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-white font-medium mb-2">Learn</p>
            <ul className="space-y-1">
              <li>
                <Link href="/learn" className={linkClasses}>
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/educators" className={linkClasses}>
                  For educators
                </Link>
              </li>
              <li>
                <Link href="/educators/feedback" className={linkClasses}>
                  Teacher feedback
                </Link>
              </li>
              {learnSubRoutes.map((route) => (
                <li key={route.slug}>
                  <Link href={`/learn/${route.slug}`} className={linkClasses}>
                    {route.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/explore" className={linkClasses}>
                  Explore (map)
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-white font-medium mb-2">Legal</p>
            <ul className="space-y-1">
              <li>
                <Link href="/terms" className={linkClasses}>
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClasses}>
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
