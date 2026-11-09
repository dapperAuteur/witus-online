import { LoadingRow } from "./loading-row";

/**
 * Route-level loading state for every page under /admin (docs/shared-ui-ux-dx.md, "Route-level
 * states"). Before this file existed, nothing reached the browser until the slowest call on a page
 * had answered; now the admin nav is sent first and the page streams in behind this row. The
 * tasks section has its own loading.tsx so its header and tabs stay put between tabs.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <LoadingRow />
    </div>
  );
}
