import Link from "next/link";
import { products } from "@/lib/products";
import { learnSubRoutes } from "@/lib/learn";

const linkClasses =
  "inline-flex items-center min-h-[32px] py-1 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-24">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10 text-sm text-slate-300">
        <RiseWellnessCallout />

        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-10">
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
                .filter(
                  (p) =>
                    p.status !== "infrastructure" &&
                    p.surfaces.includes("public-directory")
                )
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
                .filter(
                  (p) =>
                    p.status === "infrastructure" &&
                    p.surfaces.includes("public-directory")
                )
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
                  Apps
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
      </div>
    </footer>
  );
}

// Rise Wellness callout — canonical copy per public/brand/footer-recipe.md.
// Container surface + accent tokens swapped to witus.online's dark+teal theme;
// disclaimer text is byte-identical (vetted with the partner). The only token
// changed inside the disclaimer is [YOUR APP NAME] → "WitUS".
function RiseWellnessCallout() {
  return (
    <section
      aria-labelledby="rise-wellness-heading"
      className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-5 text-sm"
    >
      <header className="mb-3">
        <p className="text-[11px] uppercase tracking-wide text-teal-300 font-semibold">
          Mental health support
        </p>
        <h2
          id="rise-wellness-heading"
          className="text-base font-semibold text-slate-100"
        >
          Rise Wellness of Indiana
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Independent mental health provider · Not affiliated with WitUS
        </p>
      </header>

      <p className="text-slate-300 leading-relaxed">
        Rise Wellness of Indiana provides compassionate, personalized,
        holistic mental health care: evidence-based medicine, trauma-informed
        care, and a whole-person approach to help you heal, grow, and thrive
        in mind, body, and spirit.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
            Services
          </p>
          <ul className="text-xs text-slate-300 space-y-0.5">
            <li>ADHD testing &amp; management (in-person and from home)</li>
            <li>Anxiety &amp; depression</li>
            <li>Maternal mental health</li>
            <li>Medication management</li>
            <li>GeneSight® genetic testing</li>
            <li>Behavioral therapy &amp; coaching</li>
            <li>Routine lab testing</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
            Visit or call
          </p>
          <address className="not-italic text-xs text-slate-300 leading-relaxed">
            320 North Meridian Street
            <br />
            Indianapolis, IN 46204
            <br />
            Mon–Sat by appointment · Sun closed
          </address>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
            <a
              href="tel:+13179650299"
              className="inline-flex items-center min-h-7 font-medium text-teal-300 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
            >
              317-965-0299
            </a>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <a
              href="https://risewellnessofindiana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-7 font-medium text-teal-300 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
            >
              risewellnessofindiana.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <a
              href="https://www.centenarianos.com/safety#rise-wellness"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-7 font-medium text-teal-300 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
            >
              Full safety page
              <span className="sr-only">
                {" "}
                on centenarianos.com (opens in new tab)
              </span>
            </a>
          </div>
        </div>
      </div>

      <blockquote className="mt-4 border-l-2 border-teal-500/40 pl-3 text-xs italic text-slate-400">
        &ldquo;At Rise Wellness, we believe everyone has the capacity to rise
        above challenges and live a fulfilling, healthy life. Our care is
        guided by the belief that healing is personal, holistic, and rooted
        in compassion.&rdquo;
        <span className="block not-italic mt-1 text-slate-500">
          Rise Wellness of Indiana
        </span>
      </blockquote>

      {/* === NON-NEGOTIABLE DISCLAIMER ===
           Edit ONLY the app name token. Don't paraphrase. Don't trim.
           Don't reorder. This was vetted with the partner. */}
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Rise Wellness of Indiana is an independent organization. They are
        not affiliated with, employed by, or endorsed by WitUS,
        CentenarianOS, B4C LLC, AwesomeWebStore.com, or Anthony McDonald.
        We are grateful for their collaboration on mental health safety
        resources for our community.
      </p>
    </section>
  );
}
