import type { Metadata } from "next";
import RoadmapItem from "@/components/RoadmapItem";

export const metadata: Metadata = {
  title: "Roadmap — WitUS",
  description: "Track what's shipped, in progress, and planned across the WitUS ecosystem.",
};

const centenarianOSItems = [
  // Shipped
  { title: "Core infrastructure, auth, subscriptions, admin", status: "shipped" as const },
  { title: "Fuel — nutrition tracking with NCV framework", status: "shipped" as const },
  { title: "Blog & community publishing platform", status: "shipped" as const },
  { title: "Academy (LMS) — 100+ features", status: "shipped" as const },
  { title: "Travel & vehicle tracking", status: "shipped" as const },
  { title: "Demo accounts & onboarding", status: "shipped" as const },
  { title: "Financial dashboard", status: "shipped" as const },
  { title: "Equipment & asset tracking", status: "shipped" as const },
  { title: "Cross-module connections", status: "shipped" as const },
  { title: "Workouts & exercise library", status: "shipped" as const },
  // In Progress
  { title: "Focus Engine & AI insights — correlation analysis", status: "in_progress" as const },
  { title: "Biometrics & recovery — HRV, sleep deep-dive", status: "in_progress" as const },
  { title: "User experience & personalization", status: "in_progress" as const },
  // Planned
  { title: "Link tracking & marketing analytics", status: "planned" as const },
];

const workWitUSItems = [
  // Shipped
  { title: "Job tracking — create, manage, and status jobs", status: "shipped" as const },
  { title: "Time entries — ST/OT/DT breakdown, clock in/out", status: "shipped" as const },
  { title: "Invoice generation from time entries", status: "shipped" as const },
  { title: "Document scanner — AI extraction via Gemini", status: "shipped" as const },
  { title: "Multi-day scheduling with calendar date picker", status: "shipped" as const },
  { title: "Push notifications — clock in/out, pay day", status: "shipped" as const },
  { title: "Mileage & expense tracking", status: "shipped" as const },
  { title: "Financial dashboard", status: "shipped" as const },
  { title: "PWA / offline with background sync", status: "shipped" as const },
  // In Progress
  { title: "Job board — post available jobs publicly", status: "in_progress" as const },
  // Planned
  { title: "Crew coordinator tools", status: "planned" as const },
  { title: "Contractor analytics dashboard", status: "planned" as const },
];

export default function RoadmapPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
        Platform Roadmap
      </p>
      <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
        What we&apos;re building
      </h1>
      <p className="text-slate-400 max-w-xl leading-relaxed mb-14">
        An honest look at what&apos;s shipped, what&apos;s in progress, and what&apos;s coming
        across both platforms. Updated as work is completed.
      </p>

      <div className="grid sm:grid-cols-2 gap-10">
        {/* CentenarianOS */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
            <h2 className="text-lg font-bold text-white">CentenarianOS</h2>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-2">
            {centenarianOSItems.map((item) => (
              <RoadmapItem key={item.title} {...item} />
            ))}
          </div>
        </div>

        {/* Work.WitUS */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-lg font-bold text-white">Work.WitUS</h2>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-2">
            {workWitUSItems.map((item) => (
              <RoadmapItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-10 flex flex-wrap gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Shipped
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500" /> Planned
        </span>
      </div>
    </div>
  );
}
