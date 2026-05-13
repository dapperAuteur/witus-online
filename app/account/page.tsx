import type { Metadata } from "next";
import { products, SITE_URL, type Accent } from "@/lib/products";

export const metadata: Metadata = {
  title: "Accounts",
  description:
    "Sign-in links for every WitUS product. A unified WitUS account is on the roadmap.",
  alternates: { canonical: `${SITE_URL}/account` },
  openGraph: {
    title: "Accounts · WitUS",
    description:
      "Sign-in links for every WitUS product. A unified WitUS account is on the roadmap.",
    url: `${SITE_URL}/account`,
    images: [
      {
        url: "/og/account",
        width: 1200,
        height: 630,
        alt: "WitUS. Live Long. Work Free.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Accounts · WitUS",
    description:
      "Sign-in links for every WitUS product. A unified WitUS account is on the roadmap.",
    images: ["/og/account"],
  },
};

const tileStyles: Record<Accent, { border: string; dot: string; focus: string }> = {
  amber: {
    border: "border-amber-500/30 hover:border-amber-500/60",
    dot: "bg-amber-400",
    focus: "focus-visible:outline-amber-300",
  },
  fuchsia: {
    border: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
    dot: "bg-fuchsia-400",
    focus: "focus-visible:outline-fuchsia-300",
  },
  violet: {
    border: "border-violet-500/30 hover:border-violet-500/60",
    dot: "bg-violet-400",
    focus: "focus-visible:outline-violet-300",
  },
  sky: {
    border: "border-sky-500/30 hover:border-sky-500/60",
    dot: "bg-sky-400",
    focus: "focus-visible:outline-sky-300",
  },
  emerald: {
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    dot: "bg-emerald-400",
    focus: "focus-visible:outline-emerald-300",
  },
  rose: {
    border: "border-rose-500/30 hover:border-rose-500/60",
    dot: "bg-rose-400",
    focus: "focus-visible:outline-rose-300",
  },
  teal: {
    border: "border-teal-500/30 hover:border-teal-500/60",
    dot: "bg-teal-400",
    focus: "focus-visible:outline-teal-300",
  },
  lime: {
    border: "border-lime-500/30 hover:border-lime-500/60",
    dot: "bg-lime-400",
    focus: "focus-visible:outline-lime-300",
  },
  slate: {
    border: "border-slate-500/30 hover:border-slate-500/60",
    dot: "bg-slate-400",
    focus: "focus-visible:outline-slate-300",
  },
  cyan: {
    border: "border-cyan-500/30 hover:border-cyan-500/60",
    dot: "bg-cyan-400",
    focus: "focus-visible:outline-cyan-300",
  },
};

const faqs = [
  {
    q: "Do I need a separate account for each app?",
    a: "Yes, for now. Each WitUS app manages its own accounts and subscriptions. A unified WitUS account is on the roadmap.",
  },
  {
    q: "When will the unified account ship?",
    a: "There's no firm date. It depends on each app migrating to a common auth library. Progress shows up on the roadmap page.",
  },
  {
    q: "Will my existing accounts transfer?",
    a: "Yes. When the unified WitUS account ships, we'll migrate existing per-app accounts, not force you to start over.",
  },
  {
    q: "What email should I use?",
    a: "Whatever you like. If you plan to use multiple WitUS apps, using the same email on each will make the eventual migration easier.",
  },
  {
    q: "Does each app bill separately?",
    a: "Yes. Each app has its own subscription with its own pricing. See individual product pages for details.",
  },
  {
    q: "What if I forget a password?",
    a: "Use the password-reset flow on the app you're signing into. Each app's reset is independent today.",
  },
  {
    q: "Do all the tiles work the same way?",
    a: "Mostly. Each product tile leads to a standalone sign-in page on its own domain. AwesomeWebStore is a commerce site, so its tile opens the store homepage where order history and checkout live. Learn.WitUS and CentenarianOS share an account today since the Academy runs on CentenarianOS, so both tiles point at the same login. The Infrastructure tiles (WitUS hub admin, WitUS Inbox, WitUS Outbox) are operator-only — sign-in is restricted to the ecosystem admin.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function AccountPage() {
  const signInProducts = products.filter((p) => p.signInHref);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
          Your Accounts
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          Your WitUS accounts
        </h1>
        <p className="text-slate-400 leading-relaxed mb-12 max-w-xl">
          Each WitUS tool is its own app with its own account and its own subscription.
          A unified WitUS account is on the roadmap. Until then, this page collects
          the sign-in doors in one place.
        </p>

        <h2
          id="sign-in-heading"
          className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4"
        >
          Sign in
        </h2>
        <div
          aria-labelledby="sign-in-heading"
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16"
        >
          {signInProducts.map((product) => {
            const styles = tileStyles[product.accent];
            const sameSite = !product.external;
            const hostLabel = sameSite
              ? new URL(SITE_URL).host
              : new URL(product.signInHref!).host;
            const ariaLabel = sameSite
              ? `Sign in to ${product.name}`
              : `Sign in to ${product.name} (opens in new tab)`;
            return (
              <a
                key={product.slug}
                role="listitem"
                href={product.signInHref}
                target={sameSite ? undefined : "_blank"}
                rel={sameSite ? undefined : "noopener noreferrer"}
                aria-label={ariaLabel}
                className={`flex flex-col min-h-11 p-6 rounded-xl border bg-slate-900/50 transition-colors group focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${styles.border} ${styles.focus}`}
              >
                <span className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full ${styles.dot}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-white">
                    {product.name}
                  </span>
                </span>
                <span className="text-xs text-slate-400 group-hover:text-slate-400 transition-colors">
                  Sign in at {hostLabel} &rarr;
                </span>
              </a>
            );
          })}
        </div>

        <h2 className="text-xl font-bold text-white mb-6">
          Frequently asked questions
        </h2>
        <dl className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b border-slate-800 pb-6 last:border-0">
              <dt className="text-sm font-semibold text-white mb-2">{faq.q}</dt>
              <dd className="text-sm text-slate-400 leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
