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

async function neonFetch(key: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Neon ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
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

export async function deleteBranch(key: string, projectId: string, branchId: string): Promise<void> {
  await neonFetch(key, `/projects/${projectId}/branches/${branchId}`, { method: "DELETE" });
}
