// Neon branches created by the Vercel integration are named `preview/<git-branch>`. Only those are
// ever deleted here; default, protected and parent branches are skipped by name and by flag.
//
// KEYS ARE PROJECT-SCOPED, ONE PER PROJECT (BAM, 2026-10-15, on Neon's advice): a project-scoped key
// (Neon Console → Organization settings → API keys → Create new → Project-scoped) has Editor access
// to one project only, so a leak reaches one database. It can still change or delete ANY branch in
// that project; the `preview/` name filter below is the real guard. That is why this module never
// lists the account's projects: it is handed {projectId → key} and asks each project about itself.
// API: https://api-docs.neon.tech/reference (GET /projects/{id}, GET /projects/{id}/branches, DELETE branch).

export interface NeonProject {
  id: string;
  name: string;
}
export interface NeonBranch {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  default: boolean;
  protected: boolean;
  parentId?: string;
}

const BASE = "https://console.neon.tech/api/v2";
export const PREVIEW_PREFIX = "preview/";

/** Any non-2xx answer from Neon. `status` lets callers tell a 404 from the rest. */
export class NeonApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "NeonApiError";
    this.status = status;
  }
}

async function neonFetch(key: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new NeonApiError(`Neon ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`, res.status);
  }
  return res;
}

export async function getProject(key: string, projectId: string): Promise<NeonProject> {
  const data = (await (await neonFetch(key, `/projects/${projectId}`)).json()) as { project: { id: string; name: string } };
  return { id: data.project.id, name: data.project.name };
}

export async function listBranches(key: string, project: NeonProject): Promise<NeonBranch[]> {
  const data = (await (await neonFetch(key, `/projects/${project.id}/branches`)).json()) as {
    branches: { id: string; name: string; created_at: string; default?: boolean; protected?: boolean; parent_id?: string }[];
  };
  return data.branches.map((b) => ({
    id: b.id,
    name: b.name,
    projectId: project.id,
    projectName: project.name,
    createdAt: b.created_at,
    default: Boolean(b.default),
    protected: Boolean(b.protected),
    parentId: b.parent_id,
  }));
}

/** The only branches this module will ever delete. */
export function isDeletablePreviewBranch(b: NeonBranch, allBranches: NeonBranch[]): boolean {
  if (b.default || b.protected) return false;
  if (!b.name.startsWith(PREVIEW_PREFIX)) return false;
  // A branch that is someone's parent is not a leaf; Neon refuses to delete it anyway.
  if (allBranches.some((o) => o.parentId === b.id)) return false;
  return true;
}

/** "gone" when Neon answers 404: the branch no longer exists. Neon deletes an integration branch
 *  itself when its last Vercel preview deployment is deleted, so a branch listed a minute ago can be
 *  gone by the time its turn comes (2026-11-01). That is the outcome we wanted, not a failure. */
export async function deleteBranch(key: string, projectId: string, branchId: string): Promise<"deleted" | "gone"> {
  try {
    await neonFetch(key, `/projects/${projectId}/branches/${branchId}`, { method: "DELETE" });
    return "deleted";
  } catch (e) {
    if (e instanceof NeonApiError && e.status === 404) return "gone";
    throw e;
  }
}
