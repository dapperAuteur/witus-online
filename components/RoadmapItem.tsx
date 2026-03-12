type Status = "shipped" | "in_progress" | "planned";

interface RoadmapItemProps {
  title: string;
  description?: string;
  status: Status;
}

const statusConfig: Record<Status, { label: string; classes: string; dot: string }> = {
  shipped: {
    label: "Shipped",
    classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    dot: "bg-amber-400",
  },
  planned: {
    label: "Planned",
    classes: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    dot: "bg-slate-500",
  },
};

export default function RoadmapItem({ title, description, status }: RoadmapItemProps) {
  const config = statusConfig[status];
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-800 last:border-0">
      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white">{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.classes}`}>
            {config.label}
          </span>
        </div>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
