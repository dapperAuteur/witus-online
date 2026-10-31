import "server-only";

/**
 * Read-only GitHub REST and GraphQL calls for the admin operator pages (Deploys and Branches tabs
 * on /admin/tasks). Same token as /admin/roadmap: GITHUB_ROADMAP_TOKEN, a fine-grained read-only
 * PAT on the repos in lib/roadmap/registry.ts (tasks 132 and 141). It is sent only to
 * api.github.com and never logged or rendered. Every function returns a result; none throws.
 */

const API = "https://api.github.com";

/** Next fetch-cache tag for every GitHub read made here; the Refresh button expires it. */
export const OPS_GITHUB_TAG = "ops-github";
/** Five minutes: fresh enough to catch a failed deploy, far inside 5,000 requests an hour. */
export const OPS_REVALIDATE_SECONDS = 300;

export type GhResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

function headers(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "witus-online-admin",
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // Not JSON; the status text is enough.
  }
  return res.statusText;
}

/** GET a REST path, cached for OPS_REVALIDATE_SECONDS under OPS_GITHUB_TAG. */
export async function githubGet<T>(path: string, token: string): Promise<GhResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: headers(token),
      next: { revalidate: OPS_REVALIDATE_SECONDS, tags: [OPS_GITHUB_TAG] },
    });
  } catch (err) {
    return { ok: false, status: 0, message: `network error (${err instanceof Error ? err.name : "unknown"})` };
  }
  if (!res.ok) return { ok: false, status: res.status, message: await readError(res) };
  return { ok: true, data: (await res.json()) as T };
}

/**
 * POST a GraphQL query. Not cached here: callers wrap it in unstable_cache (a POST body is not a
 * reliable fetch-cache key).
 */
export async function githubGraphql<T>(query: string, variables: Record<string, unknown>, token: string): Promise<GhResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API}/graphql`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, status: 0, message: `network error (${err instanceof Error ? err.name : "unknown"})` };
  }
  if (!res.ok) return { ok: false, status: res.status, message: await readError(res) };
  const body = (await res.json()) as { data?: T; errors?: { message?: string; type?: string }[] };
  if (body.errors?.length) {
    const first = body.errors[0];
    const status = first.type === "NOT_FOUND" ? 404 : first.type === "FORBIDDEN" ? 403 : 200;
    return { ok: false, status, message: first.message ?? "GraphQL error" };
  }
  if (!body.data) return { ok: false, status: 200, message: "GraphQL answered without data" };
  return { ok: true, data: body.data };
}

/** A sentence for the page; never contains the token. */
export function explainGithubError(r: { status: number; message: string }, repo: string): string {
  if (r.status === 401) return "GitHub rejected the token (401). It may be expired or revoked; see task 132.";
  if (r.status === 403) return `GitHub refused (403: ${r.message}). Rate limit, or the token lacks a permission on ${repo}.`;
  if (r.status === 404) return `${repo} is not visible to the token (404). Add the repo to the token's list (task 132).`;
  if (r.status === 0) return `Could not reach GitHub: ${r.message}.`;
  return `GitHub answered ${r.status}: ${r.message}.`;
}

/** True when GitHub refused because the fine-grained token lacks the permission (not rate limit). */
export function isPermissionError(r: { status: number; message: string }): boolean {
  return r.status === 403 && /not accessible by (personal access|integration)|resource not accessible/i.test(r.message);
}
