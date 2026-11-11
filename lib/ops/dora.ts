import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { getEnv } from "@/lib/env";
import { explainGithubError, githubGet, githubGraphql, isPermissionError, OPS_GITHUB_TAG, OPS_REVALIDATE_SECONDS } from "@/lib/github/client";
import { ROADMAP_APPS } from "@/lib/roadmap/registry";
import { costOf, normalizePrices } from "@/scripts/lib/usage-core.mjs";
import pricesTable from "@/scripts/lib/claude-prices.json";
import { mapWithConcurrency } from "./concurrency.mjs";
import { deployTargets } from "./deploys";
import { appTimeline, creditsByApp, DAY_MS, isPostDeployWorkflow, statusRecords } from "./dora-core.mjs";

/**
 * Data for /admin/dora and the failed-deploy alarm (definitions: docs/02-dora-metrics.md). Per
 * registry repo, read-only, in sequence:
 *   GraphQL  Production deployments (newest 100 per page, up to 3 pages, back to 90 days) with each
 *            deployment's statuses, and main's history (100 per page, up to 8 pages, back to 100
 *            days) with parents, author dates, subjects and the Vercel commit status. One query
 *            carries both until each runs out. Needs Deployments, Contents and Commit statuses read.
 *   REST     GET /repos/{r}/actions/workflows, then per post-deploy workflow (migrate, seed, sync)
 *            GET /repos/{r}/actions/workflows/{id}/runs?branch=main&created=>=<90 days>&per_page=100.
 *            Needs Actions: Read-only; without it the repo's post-deploy data is "needs Actions read"
 *            and everything else is still computed.
 * Repos run eight at a time. The assembled overview is ONE cache entry, five minutes, under the
 * same tag as the Deploys tab, so its Refresh button expires both. The token is read inside, never
 * passed, so it is never part of a cache key.
 */

const DEPLOY_PAGES = 3;
const HISTORY_PAGES = 8;
const KEEP_DAYS = 90;
const HISTORY_DAYS = 100;
export const DORA_CONCURRENCY = 8;
/** The repo whose Claude sessions are the coordinating session (the "coordination" cost line). */
export const COORDINATION_SLUG = "witus-online";

const QUERY = `
query($owner: String!, $name: String!, $envs: [String!], $since: GitTimestamp!, $branch: String!,
      $dAfter: String, $hAfter: String, $withD: Boolean!, $withH: Boolean!, $withStatus: Boolean!) {
  repository(owner: $owner, name: $name) {
    deployments(environments: $envs, first: 100, after: $dAfter, orderBy: { field: CREATED_AT, direction: DESC }) @include(if: $withD) {
      pageInfo { hasNextPage endCursor }
      nodes { commitOid createdAt environment statuses(first: 20) { nodes { state createdAt description logUrl environmentUrl } } }
    }
    ref(qualifiedName: $branch) @include(if: $withH) {
      target { ... on Commit { history(first: 100, after: $hAfter, since: $since) {
        pageInfo { hasNextPage endCursor }
        nodes { oid authoredDate committedDate messageHeadline parents(first: 2) { nodes { oid } }
                status @include(if: $withStatus) { contexts { context state createdAt targetUrl } } }
      } } }
    }
  }
}`;

type Page<T> = { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: T[] };
type GqDeployment = {
  commitOid: string;
  createdAt: string;
  environment: string;
  statuses: { nodes: { state: string; createdAt: string; description: string | null; logUrl: string | null; environmentUrl: string | null }[] };
};
type GqCommit = {
  oid: string;
  authoredDate: string;
  committedDate: string;
  messageHeadline: string;
  parents: { nodes: { oid: string }[] };
  status?: { contexts: { context: string; state: string; createdAt: string; targetUrl: string | null }[] } | null;
};
type GqRepo = {
  repository: {
    deployments?: Page<GqDeployment>;
    ref?: { target: { history?: Page<GqCommit> } | null } | null;
  } | null;
};

export type DoraStatus = { state: string; at: string; description: string | null; url: string | null };
export type DoraDeployment = { sha: string; createdAt: string; environment: string; statuses: DoraStatus[] };
export type DoraCommit = { sha: string; authoredAt: string; committedAt: string; message: string; parents: string[] };
export type DoraRun = { workflow: string; sha: string; event: string; status: string; conclusion: string | null; createdAt: string; completedAt: string | null; url: string };

export type DoraChange = { sha: string; at: number; prevSha: string | null; commits: number | null; partial: boolean; authoringMs: number | null; mergeWaitMs: number | null; rework: boolean };
export type DoraAttempt = { sha: string; at: number; failedBy: string[] };
export type DoraEpisode = { start: number; end: number | null; sha: string; kind: string; detail: string | null; url: string | null; failures: number };
export type DoraTimeline = { changes: DoraChange[]; attempts: DoraAttempt[]; episodes: DoraEpisode[] };

/** Where an app's deployment records came from (see docs/02-dora-metrics.md, "Deployment records"). */
export type DoraSource = "deployments" | "commit-status" | "mixed" | "none";
export type ActionsAccess = "ok" | "needs-permission" | "error";

export type AppDora = {
  slug: string;
  name: string;
  repo: string;
  source: DoraSource;
  timeline: DoraTimeline;
  /** Post-deploy workflow names found; null when the workflows could not be read. */
  workflows: string[] | null;
  actions: ActionsAccess;
  /** False when GitHub's deployments and history could not be read (the row's metrics are blank). */
  readOk: boolean;
  /** What could not be read, in a sentence for the page. */
  error: string | null;
  notes: string[];
};

export type DoraOverview =
  | { tokenSet: false }
  | { tokenSet: true; readAt: string; apps: AppDora[]; needsActions: boolean };

const vercelContext = (repoName: string) => (c: { context: string }) => c.context === "Vercel" || c.context === `Vercel \u2013 ${repoName}`;

/** Deployments and history for one repo, paginated until each reaches its window or page cap. */
async function readRepoGraph(repo: string, branch: string, token: string, now: number) {
  const [owner, name] = repo.split("/");
  const keepSince = now - KEEP_DAYS * DAY_MS;
  const since = new Date(now - HISTORY_DAYS * DAY_MS).toISOString();
  const deployments: GqDeployment[] = [];
  const commits: GqCommit[] = [];
  let dAfter: string | null = null;
  let hAfter: string | null = null;
  let withD = true;
  let withH = true;
  let withStatus = true;
  let dPages = 0;
  let hPages = 0;
  let statusReadable = true;
  let truncated = false;
  while (withD || withH) {
    const variables: Record<string, unknown> = {
      owner,
      name,
      envs: ["Production", `Production \u2013 ${name}`],
      since,
      branch: `refs/heads/${branch}`,
      dAfter,
      hAfter,
      withD,
      withH,
      withStatus,
    };
    const r: Awaited<ReturnType<typeof githubGraphql<GqRepo>>> = await githubGraphql<GqRepo>(QUERY, variables, token);
    if (!r.ok) {
      // A token without Commit statuses read fails the whole query; retry once without them.
      if (withStatus && r.status === 403) {
        withStatus = false;
        statusReadable = false;
        continue;
      }
      return { ok: false as const, error: r };
    }
    const repoData: GqRepo["repository"] = r.data.repository;
    if (!repoData) return { ok: false as const, error: { status: 404, message: "repository not found" } };
    if (withD) {
      const page: Page<GqDeployment> | undefined = repoData.deployments;
      dPages += 1;
      deployments.push(...(page?.nodes ?? []));
      const oldest = page?.nodes.at(-1)?.createdAt;
      withD = Boolean(page?.pageInfo.hasNextPage && dPages < DEPLOY_PAGES && oldest && Date.parse(oldest) > keepSince);
      dAfter = page?.pageInfo.endCursor ?? null;
    }
    if (withH) {
      const page: Page<GqCommit> | undefined = repoData.ref?.target?.history;
      hPages += 1;
      commits.push(...(page?.nodes ?? []));
      truncated = Boolean(page?.pageInfo.hasNextPage && hPages >= HISTORY_PAGES);
      withH = Boolean(page?.pageInfo.hasNextPage && hPages < HISTORY_PAGES);
      hAfter = page?.pageInfo.endCursor ?? null;
    }
  }
  return { ok: true as const, deployments, commits, statusReadable, truncated };
}

/**
 * Deployment records for one repo: GitHub Production deployments, plus Vercel's commit status on
 * main's first-parent commits older than the oldest of them (dora-core statusRecords).
 */
function deploymentRecords(repoName: string, deployments: GqDeployment[], commits: GqCommit[]) {
  const out: DoraDeployment[] = deployments.map((d) => ({
    sha: d.commitOid,
    createdAt: d.createdAt,
    environment: d.environment,
    statuses: d.statuses.nodes.map((s) => ({ state: s.state.toLowerCase(), at: s.createdAt, description: s.description, url: s.logUrl ?? s.environmentUrl })),
  }));
  const oldest = deployments.length ? Math.min(...deployments.map((d) => Date.parse(d.createdAt))) : Infinity;
  const isVercel = vercelContext(repoName);
  const fromStatus = statusRecords(
    commits.map((c) => {
      const v = c.status?.contexts.find(isVercel);
      return { sha: c.oid, parents: c.parents.nodes.map((p) => p.oid), vercel: v ? { state: v.state.toLowerCase(), at: v.createdAt, url: v.targetUrl } : null };
    }),
    oldest,
  ) as DoraDeployment[];
  out.push(...fromStatus);
  const n = fromStatus.length;
  const source: DoraSource = deployments.length === 0 ? (n ? "commit-status" : "none") : n ? "mixed" : "deployments";
  return { records: out, source };
}

type WorkflowList = { workflows: { id: number; name: string; state: string }[] };
type RunList = { workflow_runs: { name: string; head_sha: string; event: string; status: string; conclusion: string | null; created_at: string; updated_at: string; html_url: string }[] };

/** Post-deploy workflow runs on main for one repo, or why they could not be read. */
async function readRuns(repo: string, token: string, now: number): Promise<{ access: ActionsAccess; workflows: string[] | null; runs: DoraRun[]; error: string | null }> {
  const list = await githubGet<WorkflowList>(`/repos/${repo}/actions/workflows?per_page=100`, token);
  if (!list.ok) {
    if (isPermissionError(list)) return { access: "needs-permission", workflows: null, runs: [], error: null };
    return { access: "error", workflows: null, runs: [], error: `Workflow runs not read: ${explainGithubError(list, repo)}` };
  }
  const wanted = list.data.workflows.filter((w) => isPostDeployWorkflow(w.name));
  const since = new Date(now - KEEP_DAYS * DAY_MS).toISOString().slice(0, 10);
  const runs: DoraRun[] = [];
  for (const w of wanted) {
    const r = await githubGet<RunList>(`/repos/${repo}/actions/workflows/${w.id}/runs?branch=main&created=%3E%3D${since}&per_page=100`, token);
    if (!r.ok) {
      if (isPermissionError(r)) return { access: "needs-permission", workflows: wanted.map((x) => x.name), runs: [], error: null };
      return { access: "error", workflows: wanted.map((x) => x.name), runs, error: `${w.name} runs not read: ${explainGithubError(r, repo)}` };
    }
    for (const x of r.data.workflow_runs) {
      if (x.event === "pull_request") continue;
      runs.push({
        workflow: w.name,
        sha: x.head_sha,
        event: x.event,
        status: x.status,
        conclusion: x.conclusion,
        createdAt: x.created_at,
        completedAt: x.status === "completed" ? x.updated_at : null,
        url: x.html_url,
      });
    }
  }
  return { access: "ok", workflows: wanted.map((x) => x.name), runs, error: null };
}

const EMPTY: DoraTimeline = { changes: [], attempts: [], episodes: [] };

/** One repo's DORA timeline. Never throws. */
async function loadAppDora(app: { slug: string; name: string; branch: string }, repo: string, token: string, now: number): Promise<AppDora> {
  const base = { slug: app.slug, name: app.name, repo };
  const repoName = repo.split("/")[1];
  const graph = await readRepoGraph(repo, app.branch, token, now);
  if (!graph.ok) {
    const permission = isPermissionError(graph.error);
    return {
      ...base,
      source: "none",
      timeline: EMPTY,
      workflows: null,
      actions: "error",
      readOk: false,
      error: permission ? "The token cannot read deployments or commits on this repo (Deployments and Contents: Read-only)." : explainGithubError(graph.error, repo),
      notes: [],
    };
  }
  const runs = await readRuns(repo, token, now);
  const { records, source } = deploymentRecords(repoName, graph.deployments, graph.commits);
  const commits: DoraCommit[] = graph.commits.map((c) => ({
    sha: c.oid,
    authoredAt: c.authoredDate,
    committedAt: c.committedDate,
    message: c.messageHeadline,
    parents: c.parents.nodes.map((p) => p.oid),
  }));
  const timeline = appTimeline({ deployments: records, commits, runs: runs.runs, now, keepDays: KEEP_DAYS }) as DoraTimeline;
  const notes: string[] = [];
  if (source === "commit-status") notes.push("No GitHub deployments: read from Vercel's commit status on main.");
  if (source === "mixed") notes.push("Older deploys read from Vercel's commit status on main (GitHub deployments were off then).");
  if (!graph.statusReadable) notes.push("The token cannot read commit statuses, so deploys from before GitHub deployments were on are missing.");
  if (graph.truncated) notes.push(`Main's history was read to ${HISTORY_PAGES * 100} commits; the oldest ranges may be short.`);
  return { ...base, source, timeline, workflows: runs.workflows, actions: runs.access, readOk: true, error: runs.error, notes };
}

async function assembleDoraOverview(): Promise<DoraOverview> {
  const token = getEnv().GITHUB_ROADMAP_TOKEN;
  if (!token) return { tokenSet: false };
  const now = Date.now();
  const apps = await mapWithConcurrency(deployTargets(), DORA_CONCURRENCY, ({ app, repo }) => loadAppDora(app, repo, token, now));
  return { tokenSet: true, readAt: new Date(now).toISOString(), apps, needsActions: apps.some((a) => a.actions === "needs-permission") };
}

const cachedDoraOverview = unstable_cache(assembleDoraOverview, ["ops-dora-overview-v1"], {
  revalidate: OPS_REVALIDATE_SECONDS,
  tags: [OPS_GITHUB_TAG],
});

/** Every registry repo's DORA timeline; cached five minutes as one entry. */
export async function loadDoraOverview(): Promise<DoraOverview> {
  if (!getEnv().GITHUB_ROADMAP_TOKEN) return { tokenSet: false };
  return cachedDoraOverview();
}

// ---- cost per change ----------------------------------------------------------------------------

const PRICES = normalizePrices(pricesTable);

export type CreditBucket = { credits: number; responses: number; unpriced: number };
export type WindowCredits = {
  byApp: Map<string, CreditBucket>;
  coordination: CreditBucket & { helperCredits: number };
  unmapped: CreditBucket & { projects: string[] };
};
export type DoraCredits =
  | { status: "ok"; windows: Record<number, WindowCredits>; earliest: string | null }
  | { status: "no-table" }
  | { status: "error"; message: string };

type UsageRow = { project: string; model: string; is_sub: boolean; recent: boolean; responses: string; input: string; cw5: string; cw1: string; cr: string; output: string };

/**
 * Credits in the 30 and 90 day windows from claude_usage_responses, grouped by project, model and
 * helper flag in SQL (a few dozen rows come back, never the responses), priced here with the same
 * table and function as scripts/usage-report.mjs.
 */
export async function loadDoraCredits(db: Db, now = Date.now()): Promise<DoraCredits> {
  const since90 = new Date(now - 90 * DAY_MS).toISOString();
  const since30 = new Date(now - 30 * DAY_MS).toISOString();
  try {
    const [res, first] = await Promise.all([
      db.execute(sql`
        select project, model, is_sub, ts >= ${since30}::timestamptz as recent, count(*) as responses,
               sum(input_tokens) as input, sum(cache_write_5m_tokens) as cw5, sum(cache_write_1h_tokens) as cw1,
               sum(cache_read_tokens) as cr, sum(output_tokens) as output
        from claude_usage_responses
        where ts >= ${since90}::timestamptz
        group by 1, 2, 3, 4
      `),
      db.execute(sql`select min(ts) as earliest from claude_usage_responses`),
    ]);
    const rows = (res.rows as unknown as UsageRow[]).map((r) => ({
      project: r.project,
      model: r.model,
      isSub: r.is_sub,
      recent: r.recent,
      responses: Number(r.responses),
      input: Number(r.input),
      cacheWrite5m: Number(r.cw5),
      cacheWrite1h: Number(r.cw1),
      cacheRead: Number(r.cr),
      output: Number(r.output),
    }));
    const priceOf = (r: (typeof rows)[number]) => costOf(PRICES, r) as number | null;
    const apps = ROADMAP_APPS.map((a) => ({ slug: a.slug, localPath: a.localPath }));
    const windows: Record<number, WindowCredits> = {
      30: creditsByApp(rows.filter((r) => r.recent), priceOf, apps, COORDINATION_SLUG) as WindowCredits,
      90: creditsByApp(rows, priceOf, apps, COORDINATION_SLUG) as WindowCredits,
    };
    const e = (first.rows[0] as { earliest?: string | Date | null } | undefined)?.earliest ?? null;
    return { status: "ok", windows, earliest: e ? new Date(e).toISOString() : null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/relation .*claude_usage_responses.* does not exist/i.test(message)) return { status: "no-table" };
    return { status: "error", message: err instanceof Error ? err.name : "unknown error" };
  }
}
