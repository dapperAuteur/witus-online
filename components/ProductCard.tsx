import type { Accent, ProductStatus } from "@/lib/products";
import { ProductLink } from "@/components/ProductLink";

interface ProductCardProps {
  name: string;
  tagline: string;
  description: string;
  href: string;
  accentColor: Accent;
  status?: ProductStatus;
  external?: boolean;
  /** Stable product slug, used as the analytics identity for this card. */
  slug: string;
}

type AccentStyle = {
  border: string;
  badge: string;
  button: string;
  dot: string;
  focus: string;
};

const accentStyles: Record<Accent, AccentStyle> = {
  orange: {
    border: "border-orange-500/30 hover:border-orange-500/60",
    badge: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
    button: "bg-orange-500 hover:bg-orange-400 text-slate-950",
    dot: "bg-orange-400",
    focus: "focus-visible:outline-orange-300",
  },
  amber: {
    border: "border-amber-500/30 hover:border-amber-500/60",
    badge: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    button: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    dot: "bg-amber-400",
    focus: "focus-visible:outline-amber-300",
  },
  fuchsia: {
    border: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
    badge: "bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20",
    button: "bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950",
    dot: "bg-fuchsia-400",
    focus: "focus-visible:outline-fuchsia-300",
  },
  violet: {
    border: "border-violet-500/30 hover:border-violet-500/60",
    badge: "bg-violet-500/10 text-violet-300 border border-violet-500/20",
    button: "bg-violet-500 hover:bg-violet-400 text-slate-950",
    dot: "bg-violet-400",
    focus: "focus-visible:outline-violet-300",
  },
  sky: {
    border: "border-sky-500/30 hover:border-sky-500/60",
    badge: "bg-sky-500/10 text-sky-300 border border-sky-500/20",
    button: "bg-sky-500 hover:bg-sky-400 text-slate-950",
    dot: "bg-sky-400",
    focus: "focus-visible:outline-sky-300",
  },
  emerald: {
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    badge: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
    button: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    dot: "bg-emerald-400",
    focus: "focus-visible:outline-emerald-300",
  },
  rose: {
    border: "border-rose-500/30 hover:border-rose-500/60",
    badge: "bg-rose-500/10 text-rose-300 border border-rose-500/20",
    button: "bg-rose-500 hover:bg-rose-400 text-slate-950",
    dot: "bg-rose-400",
    focus: "focus-visible:outline-rose-300",
  },
  teal: {
    border: "border-teal-500/30 hover:border-teal-500/60",
    badge: "bg-teal-500/10 text-teal-300 border border-teal-500/20",
    button: "bg-teal-500 hover:bg-teal-400 text-slate-950",
    dot: "bg-teal-400",
    focus: "focus-visible:outline-teal-300",
  },
  lime: {
    border: "border-lime-500/30 hover:border-lime-500/60",
    badge: "bg-lime-500/10 text-lime-300 border border-lime-500/20",
    button: "bg-lime-500 hover:bg-lime-400 text-slate-950",
    dot: "bg-lime-400",
    focus: "focus-visible:outline-lime-300",
  },
  slate: {
    border: "border-slate-500/30 hover:border-slate-500/60",
    badge: "bg-slate-500/10 text-slate-300 border border-slate-500/20",
    // slate-500 only reaches 4.23:1 against slate-950 text, so this accent
    // rests one shade lighter than the others (AA needs >= 4.5:1).
    button: "bg-slate-400 hover:bg-slate-300 text-slate-950",
    dot: "bg-slate-400",
    focus: "focus-visible:outline-slate-300",
  },
  cyan: {
    border: "border-cyan-500/30 hover:border-cyan-500/60",
    badge: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20",
    button: "bg-cyan-500 hover:bg-cyan-400 text-slate-950",
    dot: "bg-cyan-400",
    focus: "focus-visible:outline-cyan-300",
  },
};

const statusLabel: Record<ProductStatus, string> = {
  live: "Live",
  beta: "Beta",
  "coming-soon": "Coming soon",
  infrastructure: "Infrastructure",
};

const statusBadge: Record<ProductStatus, string> = {
  live: "bg-slate-800 text-slate-300 border border-slate-700",
  beta: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
  "coming-soon": "bg-slate-900 text-slate-400 border border-slate-800",
  infrastructure: "bg-slate-900 text-slate-400 border border-slate-800",
};

export default function ProductCard({
  name,
  tagline,
  description,
  href,
  accentColor,
  status = "live",
  external = true,
  slug,
}: ProductCardProps) {
  const styles = accentStyles[accentColor];
  const isDisabled = status === "coming-soon";

  const ctaClasses = `min-h-11 inline-flex items-center justify-center text-center text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${styles.focus} ${styles.button}`;
  const disabledClasses =
    "min-h-11 inline-flex items-center justify-center text-center text-sm font-semibold px-5 py-2.5 rounded-lg bg-slate-800 text-slate-400 cursor-not-allowed";

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-slate-900/60 p-6 sm:p-8 transition-all ${styles.border}`}
    >
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span
          className={`w-2 h-2 rounded-full ${styles.dot}`}
          aria-hidden="true"
        />
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}
        >
          {name}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusBadge[status]}`}
          aria-label={`Status: ${statusLabel[status]}`}
        >
          {statusLabel[status]}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{tagline}</h3>
      <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-6">
        {description}
      </p>

      {isDisabled ? (
        <span
          className={disabledClasses}
          role="button"
          aria-disabled="true"
        >
          Coming soon
        </span>
      ) : (
        <ProductLink
          href={href}
          name={name}
          slug={slug}
          status={status}
          external={external}
          className={ctaClasses}
        />
      )}
    </article>
  );
}
