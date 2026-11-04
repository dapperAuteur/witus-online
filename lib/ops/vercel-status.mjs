// Fallback for repos with no GitHub deployments: read Vercel's commit status on main instead.
// Pure apart from the injected `get`, so `npm test` covers it with a mocked GitHub
// (scripts/lib/operator-tasks.test.mjs). lib/ops/deploys.ts calls it with githubGet.
//
// Why: a Vercel project whose Git setting `gitProviderOptions.createDeployments` is "disabled"
// still posts a commit status (context "Vercel") on every commit it builds, but records no GitHub
// deployment, so the deployments API answers []. On 2026-11-03 Vercel's project API showed that
// setting disabled on invest-witus and both fit-t-cent-assessments projects (all created after
// 2026-10-27) and enabled on the older projects checked. Only main's commits are known this way,
// not every deploy, so the row says where it came from.
//
// Requests per repo, all through `get` (githubGet caches them five minutes):
//   GET /repos/{r}/commits/main/status                 always (the fallback's only call when green)
//   GET /repos/{r}/commits?sha=main&per_page=5         only when main's Vercel status is not success
//   GET /repos/{r}/commits/{sha}/status                 per older commit, stopping at the first success
// Commit statuses need "Commit statuses: Read-only" on a fine-grained token (GitHub's
// "Permissions required for fine-grained personal access tokens"); the commit list needs Contents.

/** The context Vercel's GitHub integration posts when one Vercel project is linked to the repo.
 * Several projects on one repo post "Vercel – <project>" instead; those are not matched. */
export const VERCEL_CONTEXT = "Vercel";

/** How many of main's newest commits to look through for the newest Vercel success. */
export const VERCEL_STATUS_WALK = 5;

/** Commit status states (GitHub: error, failure, pending, success) are words classifyDeploy reads
 * already; anything else is treated as still pending. */
const KNOWN = new Set(["success", "failure", "error", "pending"]);

/** @param {string} state */
export function vercelState(state) {
  return KNOWN.has(state) ? state : "pending";
}

/**
 * The status whose context is exactly "Vercel", from a combined-status response.
 * @param {{ statuses?: { context: string }[] } | null | undefined} combined
 */
export function findVercelStatus(combined) {
  return combined?.statuses?.find((s) => s.context === VERCEL_CONTEXT) ?? null;
}

/**
 * @typedef {{ context: string, state: string, created_at: string, updated_at: string, description: string | null, target_url: string | null }} CommitStatus
 * @typedef {{ sha: string, statuses: CommitStatus[] }} CombinedStatus
 * @typedef {{ ok: true, data: any } | { ok: false, status: number, message: string }} GhResult
 * @typedef {{ sha: string, createdAt: string, state: string, statusAt: string, description: string | null, logUrl: string | null }} DeployInfo
 */

/**
 * @param {string} sha
 * @param {CommitStatus} s
 * @returns {DeployInfo}
 */
function toInfo(sha, s) {
  return {
    sha,
    createdAt: s.created_at,
    state: vercelState(s.state),
    statusAt: s.updated_at ?? s.created_at,
    description: s.description ?? null,
    logUrl: s.target_url ?? null,
  };
}

/**
 * Newest Vercel status on main's head (`latest`) and the newest main commit whose Vercel status is
 * success (`live`, same object as `latest` when the head is green). `latest` is null when main has
 * no Vercel status at all. `error` is the head read failing; a failed read while walking back just
 * stops the walk (live stays unknown).
 * @param {{ repo: string, get: (path: string) => Promise<GhResult>, walk?: number }} input
 * @returns {Promise<{ latest: DeployInfo | null, live: DeployInfo | null, error: { status: number, message: string } | null }>}
 */
export async function loadVercelStatus({ repo, get, walk = VERCEL_STATUS_WALK }) {
  const head = await get(`/repos/${repo}/commits/main/status`);
  if (!head.ok) return { latest: null, live: null, error: { status: head.status, message: head.message } };
  /** @type {CombinedStatus} */
  const combined = head.data;
  const s = findVercelStatus(combined);
  if (!s) return { latest: null, live: null, error: null };
  const latest = toInfo(combined.sha, s);
  if (latest.state === "success") return { latest, live: latest, error: null };

  const commits = await get(`/repos/${repo}/commits?sha=main&per_page=${walk}`);
  if (!commits.ok || !Array.isArray(commits.data)) return { latest, live: null, error: null };
  for (const c of commits.data) {
    if (!c?.sha || c.sha === combined.sha) continue;
    const r = await get(`/repos/${repo}/commits/${c.sha}/status`);
    if (!r.ok) break;
    const v = findVercelStatus(r.data);
    if (v && v.state === "success") return { latest, live: toInfo(c.sha, v), error: null };
  }
  return { latest, live: null, error: null };
}
