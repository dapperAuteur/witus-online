import "server-only";
import { getEnv } from "@/lib/env";
import { ROADMAP_APPS, type RoadmapApp } from "@/lib/roadmap/registry";
import { explainGithubError, githubGet, isPermissionError } from "@/lib/github/client";
import { classifyDeploy, deployRank } from "./deploy-state.mjs";

/**
 * Latest Production deployment per app, from GitHub's deployments API (Vercel records every deploy
 * there). Per repo, all cached five minutes:
 *   GET /repos/{r}/deployments?environment=Production&per_page=5
 *   GET /repos/{r}/deployments/{id}/statuses?per_page=1   newest first; more only while not success
 *   GET /repos/{r}/commits/main                          head of main
 *   GET /repos/{r}/compare/{liveSha}...main              only when live != main, for the count
 * Needs Deployments: Read-only on GITHUB_ROADMAP_TOKEN (task 141); Contents covers the rest.
 */

type Deployment = { id: number; sha: string; created_at: string; environment: string };
type DeploymentStatus = { state: string; created_at: string; description: string | null; log_url: string | null; environment_url: string | null };

/** createdAt: when the deploy started; statusAt: when its newest status was set (a redeploy can turn
 * a failure into a success on the same deployment). */
export type DeployInfo = { sha: string; createdAt: string; state: string; statusAt: string; description: string | null; logUrl: string | null };

export type AppDeploy = {
  app: Pick<RoadmapApp, "slug" | "name">;
  repo: string;
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
  | { tokenSet: true; permissionMissing: boolean; apps: AppDeploy[] };

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

/** One repo's verdict. Never throws. */
export async function loadAppDeploy(app: RoadmapApp, repo: string, token: string): Promise<AppDeploy & { permission: boolean }> {
  const base = { app: { slug: app.slug, name: app.name }, repo, latest: null, live: null, mainSha: null, behindBy: null, error: null, permission: true };
  const [deps, main] = await Promise.all([
    githubGet<Deployment[]>(`/repos/${repo}/deployments?environment=Production&per_page=5`, token),
    githubGet<{ sha: string }>(`/repos/${repo}/commits/main`, token),
  ]);
  const mainSha = main.ok ? main.data.sha : null;
  if (!deps.ok) {
    return {
      ...base,
      mainSha,
      state: "error",
      tone: "amber",
      error: isPermissionError(deps) ? "The token cannot read deployments (needs Deployments: Read-only, task 141)." : explainGithubError(deps, repo),
      permission: !isPermissionError(deps),
    };
  }
  if (deps.data.length === 0) return { ...base, mainSha, ...classifyDeploy({ latestState: null, latestSha: null, liveSha: null, mainSha }) };

  const latest = await statusOf(repo, deps.data[0], token);
  if ("error" in latest) {
    return {
      ...base,
      mainSha,
      state: "error",
      tone: "amber",
      error: isPermissionError(latest.error) ? "The token cannot read deployment statuses (needs Deployments: Read-only, task 141)." : explainGithubError(latest.error, repo),
      permission: !isPermissionError(latest.error),
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
    mainSha,
    behindBy,
    error: main.ok ? null : `Head of main unknown: ${explainGithubError(main, repo)}`,
  };
}

/** Every registry repo, most urgent first. */
export async function loadDeploysOverview(): Promise<DeploysOverview> {
  const token = getEnv().GITHUB_ROADMAP_TOKEN;
  if (!token) return { tokenSet: false };
  const rows = await Promise.all(deployTargets().map(({ app, repo }) => loadAppDeploy(app, repo, token)));
  const permissionMissing = rows.some((r) => !r.permission);
  const apps = rows
    .map(({ permission: _permission, ...r }) => r)
    .sort((a, b) => deployRank(a.state) - deployRank(b.state) || a.app.name.localeCompare(b.app.name));
  return { tokenSet: true, permissionMissing, apps };
}
