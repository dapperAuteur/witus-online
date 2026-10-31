// Production deploy health from GitHub's deployments API, as one verdict per app. Pure, no
// imports, so `npm test` covers it (scripts/lib/ops.test.mjs). Fetching is lib/ops/deploys.ts.
//
// Vercel's GitHub integration records every deploy as a GitHub deployment in the "Production"
// environment with a status (success, failure, error, pending, queued, in_progress, inactive).
// "merged" is not "live": the 2026-10-30 witus-online deploy failed while its task said merged.

/** Most urgent first; the page sorts by this. */
export const DEPLOY_STATES = /** @type {const} */ ([
  "failed", //      the newest production deploy failed; the site runs an older one (or nothing)
  "behind", //      the live deploy is not main's head
  "error", //       GitHub could not be read for this repo
  "in-progress", // a production deploy is building
  "live", //        the live deploy is main's head
  "none", //        no production deployments on GitHub (not on Vercel, or never deployed)
]);

/** Red when failed or behind (the brief), amber while building or unreadable, green when live. */
export const DEPLOY_TONE = /** @type {const} */ ({
  failed: "red",
  behind: "red",
  error: "amber",
  "in-progress": "amber",
  live: "green",
  none: "grey",
});

/**
 * latestState: the newest Production deployment's newest status (null = no deployments).
 * latestSha: that deployment's commit. liveSha: the newest deployment whose status is success.
 * mainSha: head of main (null = unknown, so "behind" cannot be judged).
 * @param {{ latestState: string | null, latestSha: string | null, liveSha: string | null, mainSha: string | null }} input
 * @returns {{ state: typeof DEPLOY_STATES[number], tone: string }}
 */
export function classifyDeploy({ latestState, latestSha, liveSha, mainSha }) {
  /** @param {typeof DEPLOY_STATES[number]} state */
  const out = (state) => ({ state, tone: DEPLOY_TONE[state] });
  if (latestState == null || latestSha == null) return out("none");
  if (latestState === "failure" || latestState === "error") return out("failed");
  if (latestState === "pending" || latestState === "queued" || latestState === "in_progress") return out("in-progress");
  const deployed = latestState === "success" || latestState === "inactive" ? latestSha : liveSha;
  if (mainSha && deployed && deployed !== mainSha) return out("behind");
  return out("live");
}

/** Sort key: DEPLOY_STATES order. */
export function deployRank(state) {
  const i = DEPLOY_STATES.indexOf(state);
  return i === -1 ? DEPLOY_STATES.length : i;
}
