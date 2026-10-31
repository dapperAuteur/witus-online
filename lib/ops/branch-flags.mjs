// Unmerged-branch flags and ordering for the Branches tab on /admin/tasks. Pure, no imports, so
// `npm test` covers it. Fetching is lib/ops/branches.ts. Design: plans/future/admin-unmerged-branches-panel.md.

/** A branch with no commit for this long is probably stale (a candidate to delete). */
export const STALE_DAYS = 14;

/**
 * @param {{ name: string, committedDate: string | null }} b
 * @param {number} [now]
 * @returns {{ bundle: boolean, security: boolean, stale: boolean, ageDays: number | null }}
 */
export function flagBranch(b, now = Date.now()) {
  const t = b.committedDate ? Date.parse(b.committedDate) : Number.NaN;
  const ageDays = Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86_400_000));
  return {
    bundle: b.name.startsWith("bundle/"),
    security: /^fix\/security[-/]/.test(b.name) || /^security\//.test(b.name),
    stale: ageDays !== null && ageDays > STALE_DAYS,
    ageDays,
  };
}

/**
 * Security fixes first (they are the ones that must not wait), then bundles (the ones meant for
 * merging), then everything else; newest first inside each.
 * @template {{ name: string, committedDate: string | null }} T
 * @param {T[]} branches
 * @param {number} [now]
 * @returns {(T & ReturnType<typeof flagBranch>)[]}
 */
export function sortBranches(branches, now = Date.now()) {
  const rank = (/** @type {ReturnType<typeof flagBranch>} */ f) => (f.security ? 0 : f.bundle ? 1 : 2);
  return branches
    .map((b) => ({ ...b, ...flagBranch(b, now) }))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (Date.parse(b.committedDate ?? "") || 0) - (Date.parse(a.committedDate ?? "") || 0) ||
        a.name.localeCompare(b.name),
    );
}
