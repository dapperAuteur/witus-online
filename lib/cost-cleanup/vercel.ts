// Vercel preview deployments: the integration-created Neon branch for a git branch is deleted by
// Neon when the branch's LAST Vercel deployment is deleted, so removing preview deployments is also
// the Neon cleanup trigger. Production deployments are never listed here (target=preview only).
// API: https://vercel.com/docs/rest-api (v2 teams, v9 projects, v6 deployments, v13 delete).

export interface VercelTeam {
  id: string;
  slug: string;
}
export interface VercelProject {
  id: string;
  name: string;
}
export interface VercelPreviewDeployment {
  uid: string;
  url: string;
  projectId: string;
  projectName: string;
  created: number;
  state?: string;
  gitBranch?: string;
}

const BASE = "https://api.vercel.com";

// Vercel allows 200 deployment deletes per rate-limit window (x-ratelimit-limit: 200, read 2026-10-22);
// that day's cleanup stopped at about 200 of 272 and every later delete got 429. A caller that can wait
// (the CLI, not the admin page's request) raises this so a 429 sleeps until x-ratelimit-reset and retries.
let maxRateLimitWaitMs = 0;
export function allowRateLimitWait(ms: number): void {
  maxRateLimitWaitMs = ms;
}

/** Any non-2xx answer from Vercel. `status` lets callers tell a 404 or 429 from the rest. */
export class VercelApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "VercelApiError";
    this.status = status;
  }
}

/** Vercel said 429 and this caller could not wait. `retryAt` is when the window resets (ISO), when
 *  Vercel said so. The admin page stops calling Vercel for the rest of the run on the first one. */
export class VercelRateLimitError extends VercelApiError {
  retryAt?: string;
  constructor(message: string, retryAt?: string) {
    super(message, 429);
    this.name = "VercelRateLimitError";
    this.retryAt = retryAt;
  }
}

/** Epoch seconds or epoch milliseconds → ISO. Vercel's 429 body gives `error.limit.reset` in ms
 *  (seen 2026-11-01); the `x-ratelimit-reset` header is in seconds. Anything under 1e12 is seconds. */
function epochToIso(value: unknown): string | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n < 1e12 ? n * 1000 : n).toISOString();
}

/** When a 429's window resets: the body's `error.limit.reset` first, then the header. */
export function rateLimitResetAt(body: string, headers: Headers): string | undefined {
  try {
    const parsed = JSON.parse(body) as { error?: { limit?: { reset?: unknown } } };
    const fromBody = epochToIso(parsed.error?.limit?.reset);
    if (fromBody) return fromBody;
  } catch {
    /* not JSON */
  }
  return epochToIso(headers.get("x-ratelimit-reset"));
}

async function vercelFetch(token: string, path: string, init?: RequestInit, attempt = 0): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (res.status === 429 && attempt < 3) {
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
    const wait = Math.max(1000, (reset || Date.now() + 60_000) - Date.now()) + 1000;
    if (wait <= maxRateLimitWaitMs) {
      console.log(`vercel rate limit reached; waiting ${Math.ceil(wait / 1000)}s for the window to reset`);
      await new Promise((r) => setTimeout(r, wait));
      return vercelFetch(token, path, init, attempt + 1);
    }
  }
  if (!res.ok) {
    const full = await res.text();
    const message = `Vercel ${init?.method ?? "GET"} ${path.replace(/teamId=[^&]+/, "teamId=…")} → ${res.status}: ${full.slice(0, 300)}`;
    if (res.status === 429) throw new VercelRateLimitError(message, rateLimitResetAt(full, res.headers));
    throw new VercelApiError(message, res.status);
  }
  return res;
}

export async function listTeams(token: string): Promise<VercelTeam[]> {
  const data = (await (await vercelFetch(token, "/v2/teams")).json()) as { teams: VercelTeam[] };
  return data.teams.map((t) => ({ id: t.id, slug: t.slug }));
}

export async function listProjects(token: string, teamId: string): Promise<VercelProject[]> {
  const out: VercelProject[] = [];
  let until: number | undefined;
  do {
    const data = (await (
      await vercelFetch(token, `/v9/projects?teamId=${teamId}&limit=100${until ? `&until=${until}` : ""}`)
    ).json()) as { projects: VercelProject[]; pagination?: { next?: number } };
    out.push(...data.projects.map((p) => ({ id: p.id, name: p.name })));
    until = data.pagination?.next ?? undefined;
  } while (until);
  return out;
}

export async function listPreviewDeployments(
  token: string,
  teamId: string,
  project: VercelProject,
): Promise<VercelPreviewDeployment[]> {
  const out: VercelPreviewDeployment[] = [];
  let until: number | undefined;
  do {
    const data = (await (
      await vercelFetch(
        token,
        `/v6/deployments?teamId=${teamId}&projectId=${project.id}&target=preview&limit=100${until ? `&until=${until}` : ""}`,
      )
    ).json()) as {
      deployments: { uid: string; url: string; created: number; state?: string; meta?: Record<string, string>; target?: string }[];
      pagination?: { next?: number };
    };
    for (const d of data.deployments) {
      // Belt and braces: the query already filters on preview; never carry a production row forward.
      if (d.target === "production") continue;
      out.push({
        uid: d.uid,
        url: d.url,
        projectId: project.id,
        projectName: project.name,
        created: d.created,
        state: d.state,
        gitBranch: d.meta?.githubCommitRef ?? d.meta?.gitlabCommitRef ?? d.meta?.bitbucketCommitRef,
      });
    }
    until = data.pagination?.next ?? undefined;
  } while (until);
  return out;
}

export async function deleteDeployment(token: string, teamId: string, uid: string): Promise<void> {
  await vercelFetch(token, `/v13/deployments/${uid}?teamId=${teamId}`, { method: "DELETE" });
}
