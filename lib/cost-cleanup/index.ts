// One inventory, one cleanup, for every tool that can bill for things a preview leaves behind.
// Tokens are passed in (the admin page reads them from env; the CLI from env or the Vercel CLI's
// auth file). Nothing here touches production deployments or non-preview Neon branches.
import { mapWithConcurrency } from "../ops/concurrency.mjs";
import * as vercel from "./vercel";
import * as neon from "./neon";
import { runCleanup, type CleanupResult } from "./run";

/** Projects whose preview deployments are listed at once (one or more Vercel calls each). Vercel's
 * read limits are generous; five turns a 30-project team into six waves instead of 30 calls in a row. */
export const VERCEL_LIST_CONCURRENCY = 5;
/** Neon projects read at once (two calls each, each with that project's own key). */
export const NEON_LIST_CONCURRENCY = 4;

export interface Credentials {
  vercelToken?: string;
  /** Neon project id → that project's own project-scoped API key. One key per project, by rule. */
  neonProjectKeys?: Record<string, string>;
}

/** Parses the NEON_PROJECT_KEYS env value: a JSON object {"<project_id>":"<project-scoped key>", …}.
 *  Returns undefined when unset or empty; throws on malformed JSON so a typo is loud, not silent. */
export function parseNeonProjectKeys(raw: string | undefined): Record<string, string> | undefined {
  if (!raw || !raw.trim()) return undefined;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("NEON_PROJECT_KEYS must be a JSON object of project id → key");
  const out: Record<string, string> = {};
  for (const [id, key] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof key !== "string" || !key) throw new Error(`NEON_PROJECT_KEYS: key for project ${id} must be a non-empty string`);
    out[id] = key;
  }
  return Object.keys(out).length ? out : undefined;
}

export interface Inventory {
  vercel: { configured: boolean; teams: { slug: string; id: string }[]; deployments: vercel.VercelPreviewDeployment[]; teamOf: Record<string, string> };
  neon: { configured: boolean; branches: neon.NeonBranch[]; skipped: neon.NeonBranch[] };
  errors: string[];
}

export async function inventory(creds: Credentials): Promise<Inventory> {
  const inv: Inventory = {
    vercel: { configured: Boolean(creds.vercelToken), teams: [], deployments: [], teamOf: {} },
    neon: { configured: Boolean(creds.neonProjectKeys), branches: [], skipped: [] },
    errors: [],
  };
  const token = creds.vercelToken;
  if (token) {
    try {
      const teams = await vercel.listTeams(token);
      inv.vercel.teams = teams;
      for (const t of teams) {
        const projects = await vercel.listProjects(token, t.id);
        // Bounded parallel, results in project order, so the list reads exactly as the sequential
        // loop's did (the page sorts it anyway; the CLI prints it grouped).
        const perProject = await mapWithConcurrency(projects, VERCEL_LIST_CONCURRENCY, (p) => vercel.listPreviewDeployments(token, t.id, p));
        for (const deps of perProject) {
          for (const d of deps) inv.vercel.teamOf[d.uid] = t.id;
          inv.vercel.deployments.push(...deps);
        }
      }
    } catch (e) {
      inv.errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (creds.neonProjectKeys) {
    const perProject = await mapWithConcurrency(
      Object.entries(creds.neonProjectKeys),
      NEON_LIST_CONCURRENCY,
      async ([projectId, key]): Promise<{ all: neon.NeonBranch[]; error: string | null }> => {
        try {
          const p = await neon.getProject(key, projectId);
          return { all: await neon.listBranches(key, p), error: null };
        } catch (e) {
          return { all: [], error: `neon project ${projectId}: ${e instanceof Error ? e.message : String(e)}` };
        }
      },
    );
    for (const { all, error } of perProject) {
      if (error) inv.errors.push(error);
      for (const b of all) {
        if (neon.isDeletablePreviewBranch(b, all)) inv.neon.branches.push(b);
        else if (b.name.startsWith(neon.PREVIEW_PREFIX)) inv.neon.skipped.push(b);
      }
    }
  }
  return inv;
}

export type { CleanupResult, RateLimited } from "./run";
export { summarizeCleanup } from "./run";

/** Deletes everything the inventory lists: Vercel first, then Neon branches still present after a
 *  re-list (Neon removes an integration branch itself when its last Vercel preview goes). Stops
 *  calling Vercel on the first 429 and reports the rest as waiting; a Neon 404 counts as already
 *  gone. The loop and its rules live in ./run.ts. */
export async function cleanup(creds: Credentials, inv: Inventory, log: (line: string) => void = () => {}): Promise<CleanupResult> {
  const keys = creds.neonProjectKeys;
  const token = creds.vercelToken;
  return runCleanup(
    inv.vercel.deployments,
    inv.neon.branches,
    {
      vercel: token ? { deleteDeployment: (d) => vercel.deleteDeployment(token, inv.vercel.teamOf[d.uid], d.uid) } : undefined,
      neon: keys
        ? {
            hasKey: (projectId) => Boolean(keys[projectId]),
            listBranches: (b) => neon.listBranches(keys[b.projectId], { id: b.projectId, name: b.projectName }),
            isDeletable: neon.isDeletablePreviewBranch,
            deleteBranch: (b) => neon.deleteBranch(keys[b.projectId], b.projectId, b.id),
          }
        : undefined,
    },
    log,
  );
}

// ---- Selection: ids the admin page round-trips through a form ----------------------------------
// An id names one deletable item. The server never trusts an id on its own: it re-runs the inventory
// and keeps only ids that are still in it, so a stale or hand-made id deletes nothing.

export function deploymentId(d: vercel.VercelPreviewDeployment): string {
  return `vercel:${d.uid}`;
}
export function branchId(b: neon.NeonBranch): string {
  return `neon:${b.projectId}:${b.id}`;
}

/** The subset of `inv` whose ids are in `ids`. Vercel teamOf is carried for the kept rows only. */
export function selectFromInventory(inv: Inventory, ids: Set<string>): Inventory {
  const deployments = inv.vercel.deployments.filter((d) => ids.has(deploymentId(d)));
  const teamOf: Record<string, string> = {};
  for (const d of deployments) teamOf[d.uid] = inv.vercel.teamOf[d.uid];
  return {
    vercel: { ...inv.vercel, deployments, teamOf },
    neon: { ...inv.neon, branches: inv.neon.branches.filter((b) => ids.has(branchId(b))) },
    errors: inv.errors,
  };
}
