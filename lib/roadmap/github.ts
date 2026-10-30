import "server-only";
import { getEnv } from "@/lib/env";
import { isRoadmapStale, parseRoadmap, type ParsedRoadmap } from "./roadmap.mjs";
import { ROADMAP_APPS, type RoadmapApp } from "./registry";

/**
 * Server-side reads of each app's roadmap from the GitHub REST API.
 *
 * Three calls per app, all GETs cached by Next's fetch cache for an hour under the "roadmap" tag
 * (the admin "Refresh now" action expires the tag):
 *   1. GET /repos/{roadmapRepo}/contents/{path}?ref=main    the roadmap file, raw
 *   2. GET /repos/{githubRepo}/commits?sha=main&per_page=1   latest commit on the app's main
 *   3. GET /repos/{roadmapRepo}/commits?sha=main&path=...    latest commit touching the roadmap
 *
 * The token is GITHUB_ROADMAP_TOKEN, a fine-grained read-only PAT (Contents: read, Metadata: read)
 * on the repos in lib/roadmap/registry.ts (operator task 132). It is sent only to api.github.com
 * and never logged or rendered.
 */

export const ROADMAP_CACHE_TAG = "roadmap";
export const ROADMAP_REVALIDATE_SECONDS = 3600;
const API = "https://api.github.com";

export type CommitInfo = { sha: string; date: string; url: string; message: string };

export type RoadmapState =
  | "ok" //          file found and its frontmatter is valid
  | "invalid" //     file found, frontmatter has errors (error card)
  | "missing" //     repo readable, no roadmap file on the branch yet
  | "no-remote" //   no GitHub repo to read from
  | "no-token" //    GITHUB_ROADMAP_TOKEN is unset
  | "error"; //      GitHub refused or failed (token scope, rate limit, network)

export type AppRoadmap = {
  app: RoadmapApp;
  state: RoadmapState;
  roadmap: ParsedRoadmap | null;
  /** Human-readable reason for "error" (never contains the token). */
  error: string | null;
  /** Latest commit on the app's own repo main (null when it has no repo or it could not be read). */
  repoCommit: CommitInfo | null;
  /** Latest commit on main that touched the roadmap file. */
  roadmapCommit: CommitInfo | null;
  /** true = main is >14 days ahead of the roadmap file; null = unknown. */
  stale: boolean | null;
  /** Browser link to the roadmap file (or where it should go). */
  fileUrl: string | null;
};

export type RoadmapOverview = { tokenSet: boolean; apps: AppRoadmap[] };

type GhResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function gh<T>(path: string, token: string, raw = false): Promise<GhResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "witus-online-roadmap",
      },
      next: { revalidate: ROADMAP_REVALIDATE_SECONDS, tags: [ROADMAP_CACHE_TAG] },
    });
  } catch (err) {
    return { ok: false, status: 0, message: `network error (${err instanceof Error ? err.name : "unknown"})` };
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Body was not JSON; the status text is enough.
    }
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: (raw ? await res.text() : await res.json()) as T };
}

type CommitListItem = {
  sha: string;
  html_url: string;
  commit: { message: string; committer: { date: string } | null; author: { date: string } | null };
};

async function latestCommit(repo: string, branch: string, token: string, path?: string): Promise<GhResult<CommitInfo | null>> {
  const q = new URLSearchParams({ sha: branch, per_page: "1" });
  if (path) q.set("path", path);
  const r = await gh<CommitListItem[]>(`/repos/${repo}/commits?${q}`, token);
  if (!r.ok) return r;
  const c = r.data[0];
  if (!c) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      sha: c.sha,
      date: c.commit.committer?.date ?? c.commit.author?.date ?? "",
      url: c.html_url,
      message: c.commit.message.split("\n")[0] ?? "",
    },
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function explain(r: { status: number; message: string }, repo: string): string {
  if (r.status === 401) return "GitHub rejected the token (401). It may be expired or revoked; see task 132.";
  if (r.status === 403) return `GitHub refused (403: ${r.message}). Rate limit, or the token lacks access to ${repo}.`;
  if (r.status === 404) return `${repo} is not visible to the token (404). Add the repo to the token's list (task 132).`;
  if (r.status === 0) return `Could not reach GitHub: ${r.message}.`;
  return `GitHub answered ${r.status}: ${r.message}.`;
}

function base(app: RoadmapApp): AppRoadmap {
  return {
    app,
    state: "no-remote",
    roadmap: null,
    error: null,
    repoCommit: null,
    roadmapCommit: null,
    stale: null,
    fileUrl: app.roadmapRepo ? `https://github.com/${app.roadmapRepo}/blob/${app.branch}/${app.roadmapPath}` : null,
  };
}

/** Read one app's roadmap. Never throws: every failure becomes a state the page can show. */
export async function loadAppRoadmap(app: RoadmapApp, token: string | undefined): Promise<AppRoadmap> {
  const out = base(app);
  if (!app.roadmapRepo) return out;
  if (!token) return { ...out, state: "no-token" };

  const [file, fileCommit, repoCommit] = await Promise.all([
    gh<string>(`/repos/${app.roadmapRepo}/contents/${encodePath(app.roadmapPath)}?ref=${encodeURIComponent(app.branch)}`, token, true),
    latestCommit(app.roadmapRepo, app.branch, token, app.roadmapPath),
    app.githubRepo ? latestCommit(app.githubRepo, app.branch, token) : Promise.resolve(null),
  ]);

  if (repoCommit?.ok) out.repoCommit = repoCommit.data;
  if (fileCommit.ok) out.roadmapCommit = fileCommit.data;

  if (!file.ok) {
    // A 404 on the file is "no roadmap yet" only when the repo itself is readable; otherwise the
    // token cannot see the repo and the page should say so.
    const repoReadable = fileCommit.ok;
    if (file.status === 404 && repoReadable) return { ...out, state: "missing" };
    return { ...out, state: "error", error: explain(file, app.roadmapRepo) };
  }

  const roadmap = parseRoadmap(file.data);
  out.roadmap = roadmap;
  out.state = roadmap.ok ? "ok" : "invalid";
  out.stale = isRoadmapStale(out.roadmapCommit?.date, out.repoCommit?.date);
  if (repoCommit && !repoCommit.ok && app.githubRepo) {
    out.error = `Last commit to main unknown: ${explain(repoCommit, app.githubRepo)}`;
  }
  return out;
}

/** Every registry app's roadmap, in registry order. */
export async function loadRoadmapOverview(): Promise<RoadmapOverview> {
  const token = getEnv().GITHUB_ROADMAP_TOKEN;
  const apps = await Promise.all(ROADMAP_APPS.map((a) => loadAppRoadmap(a, token)));
  return { tokenSet: Boolean(token), apps };
}
