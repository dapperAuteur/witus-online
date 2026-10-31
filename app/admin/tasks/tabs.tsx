"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sections of /admin/tasks. Each is its own route so a phone loads only the tab it opens. */
export const TASK_TABS = [
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/tasks/deploys", label: "Deploys" },
  { href: "/admin/tasks/branches", label: "Branches" },
] as const;

export function TaskTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Operator sections" className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
      {TASK_TABS.map((tab) => {
        const current = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${
              current ? "bg-slate-800 text-teal-200" : "text-slate-300 hover:text-teal-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
