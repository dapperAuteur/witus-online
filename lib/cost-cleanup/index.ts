// One inventory, one cleanup, for every tool that can bill for things a preview leaves behind.
// Tokens are passed in (the admin page reads them from env; the CLI from env or the Vercel CLI's
// auth file). Nothing here touches production deployments or non-preview Neon branches.
import * as vercel from "./vercel";
import * as neon from "./neon";

export interface Credentials {
  vercelToken?: string;
  neonApiKey?: string;
}

export interface Inventory {
  vercel: { configured: boolean; teams: { slug: string; id: string }[]; deployments: vercel.VercelPreviewDeployment[]; teamOf: Record<string, string> };
  neon: { configured: boolean; branches: neon.NeonBranch[]; skipped: neon.NeonBranch[] };
  errors: string[];
}

export async function inventory(creds: Credentials): Promise<Inventory> {
  const inv: Inventory = {
    vercel: { configured: Boolean(creds.vercelToken), teams: [], deployments: [], teamOf: {} },
    neon: { configured: Boolean(creds.neonApiKey), branches: [], skipped: [] },
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
  if (creds.neonApiKey) {
    try {
      const projects = await neon.listProjects(creds.neonApiKey);
      for (const p of projects) {
        const all = await neon.listBranches(creds.neonApiKey, p);
        for (const b of all) {
          if (neon.isDeletablePreviewBranch(b, all)) inv.neon.branches.push(b);
          else if (b.name.startsWith(neon.PREVIEW_PREFIX)) inv.neon.skipped.push(b);
        }
      }
    } catch (e) {
      inv.errors.push(e instanceof Error ? e.message : String(e));
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
  if (creds.neonApiKey) {
    for (const b of inv.neon.branches) {
      try {
        await neon.deleteBranch(creds.neonApiKey, b.projectId, b.id);
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
