import "server-only";
import { unstable_cache } from "next/cache";
import { getEnv } from "@/lib/env";
import { ROADMAP_APPS, type RoadmapApp } from "@/lib/roadmap/registry";
import { explainGithubError, githubGet, isPermissionError, OPS_GITHUB_TAG, OPS_REVALIDATE_SECONDS } from "@/lib/github/client";
import { mapWithConcurrency } from "./concurrency.mjs";
import { classifyDeploy, deployRank } from "./deploy-state.mjs";
import { loadVercelStatus } from "./vercel-status.mjs";

/**
 * Latest Production deployment per app, from GitHub's deployments API (Vercel records every deploy
 * there). Per repo, in sequence where one answer decides the next; the assembled overview is cached
 * five minutes as one entry (loadDeploysOverview):
 *   GET /repos/{r}/deployments?environment=Production&per_page=5
 *   GET /repos/{r}/deployments/{id}/statuses?per_page=1   newest first; more only while not success
 *   GET /repos/{r}/commits/main                          head of main
 *   GET /repos/{r}/compare/{liveSha}...main              only when live != main, for the count
 * Needs Deployments: Read-only on GITHUB_ROADMAP_TOKEN (task 141); Contents covers the rest.
 *
 * A repo with no Production deployments falls back to Vercel's commit status on main (a Vercel
 * project with GitHub deployments turned off still posts one; invest-witus, task 152). That adds
 * GET /repos/{r}/commits/main/status, plus, only when main's head is not green, the newest five
 * main commits and their statuses until one is green (lib/ops/vercel-status.mjs). It needs
 * Commit statuses: Read-only on the same token (task 152).
 */

type Deployment = { id: number; sha: string; created_at: string; environment: string };
type DeploymentStatus = { state: string; created_at: string; description: string | null; log_url: string | null; environment_url: string | null };

/** createdAt: when the deploy started; statusAt: when its newest status was set (a redeploy can turn
 * a failure into a success on the same deployment). */
export type DeployInfo = { sha: string; createdAt: string; state: string; statusAt: string; description: string | null; logUrl: string | null };

/** Where a row's deploy came from: GitHub deployments, or (when a repo has none) the commit status
 * Vercel posts on main's commits. */
export type DeploySource = "deployments" | "commit-status";

/** Fine-grained token permissions the page can find missing. */
export type TokenPermission = "Deployments" | "Commit statuses";

export type AppDeploy = {
  app: Pick<RoadmapApp, "slug" | "name">;
  repo: string;
  source: DeploySource;
  state: "failed" | "behind" | "error" | "in-progress" | "live" | "none";
  tone: string;
  /** Newest Production deployment and its newest status. */
  latest: DeployInfo | null;
  /** Newest successful one, when it is not `latest`. */
  live: DeployInfo | null;
  mainSha: string | null;
  /** Commits on main that the live deploy does not have; null when unknown or zero. */
  behindBy: number | null;
  error: string | null;
};

export type DeploysOverview =
  | { tokenSet: false }
  | { tokenSet: true; missingPermissions: TokenPermission[]; apps: AppDeploy[] };

/** One row per GitHub repo in the roadmap registry (apps sharing a repo appear once). */
export function deployTargets(): { app: RoadmapApp; repo: string }[] {
  const seen = new Set<string>();
  const out: { app: RoadmapApp; repo: string }[] = [];
  for (const app of ROADMAP_APPS) {
    if (!app.githubRepo || seen.has(app.githubRepo)) continue;
    seen.add(app.githubRepo);
    out.push({ app, repo: app.githubRepo });
  }
  return out;
}

async function statusOf(repo: string, d: Deployment, token: string): Promise<DeployInfo | { error: { status: number; message: string } }> {
  const r = await githubGet<DeploymentStatus[]>(`/repos/${repo}/deployments/${d.id}/statuses?per_page=1`, token);
  if (!r.ok) return { error: r };
  const s = r.data[0];
  return {
    sha: d.sha,
    createdAt: d.created_at,
    state: s?.state ?? "pending",
    statusAt: s?.created_at ?? d.created_at,
    description: s?.description ?? null,
    logUrl: s?.log_url ?? s?.environment_url ?? null,
  };
}

type Loaded = AppDeploy & { permission: TokenPermission | null };

/** Verdict from the newest deploy, the newest green one, and main's head; adds the behind count. */
async function finish(
  base: Omit<Loaded, "state" | "tone" | "latest" | "live" | "behindBy">,
  latest: DeployInfo,
  live: DeployInfo | null,
  token: string,
): Promise<Loaded> {
  const { repo, mainSha } = base;
  const verdict = classifyDeploy({ latestState: latest.state, latestSha: latest.sha, liveSha: live?.sha ?? null, mainSha });
  let behindBy: number | null = null;
  const liveSha = live?.sha ?? null;
  if (mainSha && liveSha && liveSha !== mainSha) {
    const cmp = await githubGet<{ ahead_by: number }>(`/repos/${repo}/compare/${liveSha}...${mainSha}`, token);
    if (cmp.ok && cmp.data.ahead_by > 0) behindBy = cmp.data.ahead_by;
  }
  return {
    ...base,
    ...verdict,
    state: verdict.state as AppDeploy["state"],
    latest,
    live: live && live.sha !== latest.sha ? live : null,
    behindBy,
  };
}

/** No GitHub deployments: read Vercel's commit status on main instead. */
async function fromCommitStatus(base: Omit<Loaded, "state" | "tone" | "latest" | "live" | "behindBy">, token: string): Promise<Loaded> {
  const { repo, mainSha } = base;
  const r = await loadVercelStatus({ repo, get: (path: string) => githubGet<unknown>(path, token) });
  if (r.error) {
    const permission = isPermissionError(r.error);
    return {
      ...base,
      source: "commit-status",
      state: "error",
      tone: "amber",
      latest: null,
      live: null,
      behindBy: null,
      error: permission
        ? "No GitHub deployments, and the token cannot read commit statuses (needs Commit statuses: Read-only, task 152)."
        : `No GitHub deployments; Vercel's commit status could not be read: ${explainGithubError(r.error, repo)}`,
      permission: permission ? "Commit statuses" : null,
    };
  }
  const none = classifyDeploy({ latestState: null, latestSha: null, liveSha: null, mainSha });
  if (!r.latest) return { ...base, ...none, state: none.state as AppDeploy["state"], latest: null, live: null, behindBy: null };
  return finish({ ...base, source: "commit-status" }, r.latest, r.live, token);
}

/** One repo's verdict. Never throws. */
export async function loadAppDeploy(app: RoadmapApp, repo: string, token: string): Promise<Loaded> {
  const [deps, main] = await Promise.all([
    githubGet<Deployment[]>(`/repos/${repo}/deployments?environment=Production&per_page=5`, token),
    githubGet<{ sha: string }>(`/repos/${repo}/commits/main`, token),
  ]);
  const mainSha = main.ok ? main.data.sha : null;
  const base = {
    app: { slug: app.slug, name: app.name },
    repo,
    source: "deployments" as DeploySource,
    mainSha,
    error: main.ok ? null : `Head of main unknown: ${explainGithubError(main, repo)}`,
    permission: null,
  };
  const empty = { latest: null, live: null, behindBy: null };
  if (!deps.ok) {
    const permission = isPermissionError(deps);
    return {
      ...base,
      ...empty,
      state: "error",
      tone: "amber",
      error: permission ? "The token cannot read deployments (needs Deployments: Read-only, task 141)." : explainGithubError(deps, repo),
      permission: permission ? "Deployments" : null,
    };
  }
  if (deps.data.length === 0) return fromCommitStatus(base, token);

  const latest = await statusOf(repo, deps.data[0], token);
  if ("error" in latest) {
    const permission = isPermissionError(latest.error);
    return {
      ...base,
      ...empty,
      state: "error",
      tone: "amber",
      error: permission ? "The token cannot read deployment statuses (needs Deployments: Read-only, task 141)." : explainGithubError(latest.error, repo),
      permission: permission ? "Deployments" : null,
    };
  }
  let live: DeployInfo | null = latest.state === "success" ? latest : null;
  if (!live) {
    for (const d of deps.data.slice(1)) {
      const s = await statusOf(repo, d, token);
      if ("error" in s) break;
      if (s.state === "success" || s.state === "inactive") {
        live = s;
        break;
      }
    }
  }
  return finish(base, latest, live, token);
}

/** Repos read at once. Each starts two requests, so GitHub sees at most 16 in flight (its secondary
 * limit refuses bursts near 100). A cold read of 27 repos is four waves, a few seconds in all. */
export const DEPLOY_CONCURRENCY = 8;

/** Every registry repo, most urgent first. Reads GitHub; pages call the cached wrapper below. */
async function assembleDeploysOverview(): Promise<DeploysOverview> {
  const token = getEnv().GITHUB_ROADMAP_TOKEN;
  if (!token) return { tokenSet: false };
  const rows = await mapWithConcurrency(deployTargets(), DEPLOY_CONCURRENCY, ({ app, repo }) => loadAppDeploy(app, repo, token));
  const missingPermissions = [...new Set(rows.flatMap((r) => (r.permission ? [r.permission] : [])))];
  const apps = rows
    .map(({ permission: _permission, ...r }) => r)
    .sort((a, b) => deployRank(a.state) - deployRank(b.state) || a.app.name.localeCompare(b.app.name));
  return { tokenSet: true, missingPermissions, apps };
}

/**
 * The whole overview as ONE cache entry, five minutes under OPS_GITHUB_TAG. Before, each of the 80
 * to 110 GitHub reads was cached on its own, so even a warm page did that many cache lookups, three
 * or four deep per repo; now a warm page is one lookup. A stale entry is served while Next refetches
 * in the background; the Refresh button (updateTag) expires it so the next render reads GitHub again.
 * Fetches inside unstable_cache skip the fetch cache, so this is the only copy. The token is read
 * inside, never passed, so it can never be part of the cache key.
 */
const cachedDeploysOverview = unstable_cache(assembleDeploysOverview, ["ops-deploys-overview-v1"], {
  revalidate: OPS_REVALIDATE_SECONDS,
  tags: [OPS_GITHUB_TAG],
});

/** Every registry repo, most urgent first; cached five minutes. */
export async function loadDeploysOverview(): Promise<DeploysOverview> {
  // "No token" is answered without the cache, so a newly set token shows on the next request.
  if (!getEnv().GITHUB_ROADMAP_TOKEN) return { tokenSet: false };
  return cachedDeploysOverview();
}
