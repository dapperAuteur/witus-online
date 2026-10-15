// One inventory, one cleanup, for every tool that can bill for things a preview leaves behind.
// Tokens are passed in (the admin page reads them from env; the CLI from env or the Vercel CLI's
// auth file). Nothing here touches production deployments or non-preview Neon branches.
import * as vercel from "./vercel";
import * as neon from "./neon";

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
  if (creds.vercelToken) {
    try {
      const teams = await vercel.listTeams(creds.vercelToken);
      inv.vercel.teams = teams;
      for (const t of teams) {
        const projects = await vercel.listProjects(creds.vercelToken, t.id);
        for (const p of projects) {
          const deps = await vercel.listPreviewDeployments(creds.vercelToken, t.id, p);
          for (const d of deps) inv.vercel.teamOf[d.uid] = t.id;
          inv.vercel.deployments.push(...deps);
        }
      }
    } catch (e) {
      inv.errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (creds.neonProjectKeys) {
    for (const [projectId, key] of Object.entries(creds.neonProjectKeys)) {
      try {
        const p = await neon.getProject(key, projectId);
        const all = await neon.listBranches(key, p);
        for (const b of all) {
          if (neon.isDeletablePreviewBranch(b, all)) inv.neon.branches.push(b);
          else if (b.name.startsWith(neon.PREVIEW_PREFIX)) inv.neon.skipped.push(b);
        }
      } catch (e) {
        inv.errors.push(`neon project ${projectId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return inv;
}

export interface CleanupResult {
  vercelDeleted: number;
  neonDeleted: number;
  failures: string[];
}

/** Deletes everything the inventory lists. Neon first (explicit), then Vercel (which also triggers
 *  Neon's own cleanup for branches the integration still tracks). */
export async function cleanup(creds: Credentials, inv: Inventory, log: (line: string) => void = () => {}): Promise<CleanupResult> {
  const result: CleanupResult = { vercelDeleted: 0, neonDeleted: 0, failures: [] };
  if (creds.neonProjectKeys) {
    for (const b of inv.neon.branches) {
      const key = creds.neonProjectKeys[b.projectId];
      if (!key) {
        result.failures.push(`neon ${b.projectName}/${b.name}: no key for project ${b.projectId}`);
        continue;
      }
      try {
        await neon.deleteBranch(key, b.projectId, b.id);
        result.neonDeleted++;
        log(`neon   deleted ${b.projectName} / ${b.name}`);
      } catch (e) {
        result.failures.push(`neon ${b.projectName}/${b.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  if (creds.vercelToken) {
    for (const d of inv.vercel.deployments) {
      try {
        await vercel.deleteDeployment(creds.vercelToken, inv.vercel.teamOf[d.uid], d.uid);
        result.vercelDeleted++;
        log(`vercel deleted ${d.projectName} / ${d.url}${d.gitBranch ? ` (${d.gitBranch})` : ""}`);
      } catch (e) {
        result.failures.push(`vercel ${d.projectName}/${d.url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return result;
}
