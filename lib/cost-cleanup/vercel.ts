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

async function vercelFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Vercel ${init?.method ?? "GET"} ${path.replace(/teamId=[^&]+/, "teamId=…")} → ${res.status}: ${body}`);
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
