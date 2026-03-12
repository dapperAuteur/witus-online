interface ProductCardProps {
  name: string;
  tagline: string;
  description: string;
  href: string;
  accentColor: "amber" | "fuchsia";
}

const accentStyles = {
  amber: {
    border: "border-amber-500/30 hover:border-amber-500/60",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    button: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    dot: "bg-amber-400",
  },
  fuchsia: {
    border: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
    badge: "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20",
    button: "bg-fuchsia-500 hover:bg-fuchsia-400 text-white",
    dot: "bg-fuchsia-400",
  },
};

export default function ProductCard({
  name,
  tagline,
  description,
  href,
  accentColor,
}: ProductCardProps) {
  const styles = accentStyles[accentColor];

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-slate-900/60 p-8 transition-all ${styles.border}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
          {name}
        </span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{tagline}</h3>
      <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-6">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block text-center text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors ${styles.button}`}
      >
        Open {name} &rarr;
      </a>
    </div>
  );
}
