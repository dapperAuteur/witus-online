/**
 * The row an admin page shows while its data loads: the route-level loading.tsx files under /admin
 * and the in-page Suspense fallbacks (deploys, branches, roadmap, cost cleanup) all render this, so
 * the nav, headings and Refresh buttons appear at once and only the slow part waits. Plain server
 * markup, no client JS. `role="status"` so a screen reader hears it once; the pulse respects
 * prefers-reduced-motion (docs/shared-ui-ux-dx.md).
 */
export function LoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-slate-800 px-4 py-6 text-sm text-slate-400 motion-safe:animate-pulse"
    >
      {label}
    </div>
  );
}
