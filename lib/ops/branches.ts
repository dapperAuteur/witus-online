import "server-only";
import { unstable_cache } from "next/cache";
import { getEnv } from "@/lib/env";
import { explainGithubError, githubGraphql, OPS_GITHUB_TAG, OPS_REVALIDATE_SECONDS, type GhResult } from "@/lib/github/client";
import { sortBranches } from "./branch-flags.mjs";
import { deployTargets } from "./deploys";

/**
 * Branches ahead of main, per registry repo (design: plans/future/admin-unmerged-branches-panel.md).
 * One GraphQL query per 100 branches: each ref's last commit plus `compare(headRef: "main")`, so a
 * repo with 135 branches costs two requests instead of 136 REST compares. Cached five minutes under
 * the same tag as the Deploys tab. Read-only: merging stays on GitHub (branch-hygiene rule).
 *
 * GraphQL's Ref.compare treats the ref as the BASE and `headRef` as the head, so for a branch B,
 * `B.compare(headRef: "main")` gives aheadBy = commits main has that B lacks (B is behind by that)
 * and behindBy = commits B has that main lacks (B is ahead by that). Checked on 2026-10-31 against
 * REST `compare/main...<branch>` for witus-online.
 */

const MAX_PAGES = 5; // 500 branches per repo; the busiest repo had 135 on 2026-10-31.

const QUERY = `
query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    refs(refPrefix: "refs/heads/", first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        target { ... on Commit { committedDate messageHeadline } }
        compare(headRef: "main") { aheadBy behindBy }
      }
    }
  }
}`;

type RefNode = {
  name: string;
  target: { committedDate?: string; messageHeadline?: string } | null;
  compare: { aheadBy: number; behindBy: number } | null;
};
type Refs = { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RefNode[] };
type RefsPage = { repository: { refs: Refs } | null };

export type UnmergedBranch = {
  name: string;
  ahead: number;
  behind: number;
  committedDate: string | null;
  subject: string;
  bundle: boolean;
  security: boolean;
  stale: boolean;
  ageDays: number | null;
};

export type RepoBranches = {
  app: { slug: string; name: string };
  repo: string;
  total: number;
  unmerged: UnmergedBranch[];
  error: string | null;
};

export type BranchesOverview = { tokenSet: false } | { tokenSet: true; repos: RepoBranches[] };

type RawRepo = { total: number; branches: Omit<UnmergedBranch, "bundle" | "security" | "stale" | "ageDays">[]; error: string | null };

async function fetchRepo(repo: string, token: string): Promise<RawRepo> {
  const [owner, name] = repo.split("/");
  const branches: RawRepo["branches"] = [];
  let total = 0;
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const r: GhResult<RefsPage> = await githubGraphql<RefsPage>(QUERY, { owner, name, after }, token);
    if (!r.ok) return { total, branches, error: explainGithubError(r, repo) };
    const refs: Refs | undefined = r.data.repository?.refs;
    if (!refs) return { total, branches, error: `${repo} is not visible to the token (task 132).` };
    for (const n of refs.nodes) {
      total++;
      if (n.name === "main" || !n.compare) continue;
      const ahead = n.compare.behindBy;
      if (ahead <= 0) continue;
      branches.push({
        name: n.name,
        ahead,
        behind: n.compare.aheadBy,
        committedDate: n.target?.committedDate ?? null,
        subject: n.target?.messageHeadline ?? "",
      });
    }
    if (!refs.pageInfo.hasNextPage) return { total, branches, error: null };
    after = refs.pageInfo.endCursor;
  }
  return { total, branches, error: `More than ${MAX_PAGES * 100} branches; only the first ${MAX_PAGES * 100} were checked.` };
}

/**
 * Cached per repo: unstable_cache keys on its arguments, so the only argument is the repo name.
 * The token is read inside, never passed, so it can never end up in a cache key.
 */
const cachedRepo = unstable_cache(
  async (repo: string): Promise<RawRepo> => {
    const token = getEnv().GITHUB_ROADMAP_TOKEN;
    if (!token) return { total: 0, branches: [], error: "GITHUB_ROADMAP_TOKEN is not set (task 132)." };
    return fetchRepo(repo, token);
  },
  ["ops-branches-v1"],
  { revalidate: OPS_REVALIDATE_SECONDS, tags: [OPS_GITHUB_TAG] },
);

export async function loadBranchesOverview(): Promise<BranchesOverview> {
  if (!getEnv().GITHUB_ROADMAP_TOKEN) return { tokenSet: false };
  const now = Date.now();
  const repos = await Promise.all(
    deployTargets().map(async ({ app, repo }): Promise<RepoBranches> => {
      const raw = await cachedRepo(repo);
      return { app: { slug: app.slug, name: app.name }, repo, total: raw.total, unmerged: sortBranches(raw.branches, now), error: raw.error };
    }),
  );
  const rank = (r: RepoBranches) => (r.unmerged.some((b) => b.security) ? 0 : r.unmerged.some((b) => b.bundle) ? 1 : r.unmerged.length ? 2 : 3);
  repos.sort((a, b) => rank(a) - rank(b) || b.unmerged.length - a.unmerged.length || a.app.name.localeCompare(b.app.name));
  return { tokenSet: true, repos };
}
