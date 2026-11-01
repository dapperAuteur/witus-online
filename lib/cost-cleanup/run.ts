// The delete loop behind cleanup(), with the API calls passed in so it can be tested without a
// network (scripts/lib/cost-cleanup.test.mjs). Type-only imports, so Node can load this file by
// stripping types.
//
// Order: Vercel first, then Neon. Deleting a git branch's last Vercel preview makes Neon delete that
// branch's integration database branch on its own, so the Neon pass re-lists each project and only
// deletes branches that are still there and still pass the same preview filter as the inventory.
//
// Vercel's delete limit (BAM, 2026-11-01): Vercel allows 200 deletes per window ("more than 200,
// code: now-rm"). On the first 429 this run stops calling Vercel, so it does not spend requests on
// answers it knows, and reports the rest as waiting with the reset time instead of N failures.
import type { NeonBranch } from "./neon";
import type { VercelPreviewDeployment } from "./vercel";

export interface CleanupOps {
  /** Present only when a Vercel token is configured. */
  vercel?: {
    deleteDeployment(d: VercelPreviewDeployment): Promise<void>;
  };
  /** Present only when Neon keys are configured. */
  neon?: {
    hasKey(projectId: string): boolean;
    /** Every branch in the project now, for the re-list after the Vercel pass. */
    listBranches(b: NeonBranch): Promise<NeonBranch[]>;
    /** The inventory's own filter (neon.isDeletablePreviewBranch), re-applied to the fresh list. */
    isDeletable(b: NeonBranch, all: NeonBranch[]): boolean;
    /** "gone" when Neon answers 404. */
    deleteBranch(b: NeonBranch): Promise<"deleted" | "gone">;
  };
}

export interface RateLimited {
  /** Deployments this run did not delete because Vercel's limit was reached (includes the one that got the 429). */
  remaining: number;
  /** When Vercel's window resets (ISO), if Vercel said. */
  retryAt?: string;
  notAttempted: VercelPreviewDeployment[];
}

export interface CleanupResult {
  vercelDeleted: number;
  neonDeleted: number;
  /** Items that no longer existed when their turn came: Neon 404s and branches missing from the re-list. */
  alreadyGone: number;
  /** Real failures only. Rate-limited and already-gone items are counted above, not here. */
  failures: string[];
  rateLimited?: RateLimited;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function isRateLimit(e: unknown): e is { status: number; retryAt?: string } {
  return typeof e === "object" && e !== null && (e as { status?: unknown }).status === 429;
}

export async function runCleanup(
  deployments: VercelPreviewDeployment[],
  branches: NeonBranch[],
  ops: CleanupOps,
  log: (line: string) => void = () => {},
): Promise<CleanupResult> {
  const result: CleanupResult = { vercelDeleted: 0, neonDeleted: 0, alreadyGone: 0, failures: [] };

  if (ops.vercel) {
    for (let i = 0; i < deployments.length; i++) {
      const d = deployments[i];
      try {
        await ops.vercel.deleteDeployment(d);
        result.vercelDeleted++;
        log(`vercel deleted ${d.projectName} / ${d.url}${d.gitBranch ? ` (${d.gitBranch})` : ""}`);
      } catch (e) {
        if (isRateLimit(e)) {
          const notAttempted = deployments.slice(i);
          result.rateLimited = { remaining: notAttempted.length, retryAt: e.retryAt, notAttempted };
          log(`vercel delete limit reached; ${notAttempted.length} deployment(s) not attempted`);
          break;
        }
        result.failures.push(`vercel ${d.projectName}/${d.url}: ${message(e)}`);
      }
    }
  }

  if (ops.neon && branches.length) {
    const neon = ops.neon;
    // One re-list per project. A failed re-list falls back to the inventory's rows (already filtered);
    // a branch that has gone since then answers 404 and is counted as gone.
    const fresh = new Map<string, NeonBranch[] | null>();
    for (const b of branches) {
      if (fresh.has(b.projectId) || !neon.hasKey(b.projectId)) continue;
      try {
        fresh.set(b.projectId, await neon.listBranches(b));
      } catch (e) {
        fresh.set(b.projectId, null);
        log(`neon   could not re-list ${b.projectName} (${message(e)}); deleting from the inventory`);
      }
    }
    for (const b of branches) {
      if (!neon.hasKey(b.projectId)) {
        result.failures.push(`neon ${b.projectName}/${b.name}: no key for project ${b.projectId}`);
        continue;
      }
      const all = fresh.get(b.projectId);
      if (all) {
        const now = all.find((o) => o.id === b.id);
        if (!now) {
          result.alreadyGone++;
          log(`neon   already gone ${b.projectName} / ${b.name}`);
          continue;
        }
        if (!neon.isDeletable(now, all)) {
          result.failures.push(`neon ${b.projectName}/${b.name}: no longer passes the preview filter (default, protected or a parent now); not deleted`);
          continue;
        }
      }
      try {
        const outcome = await neon.deleteBranch(b);
        if (outcome === "gone") {
          result.alreadyGone++;
          log(`neon   already gone ${b.projectName} / ${b.name}`);
        } else {
          result.neonDeleted++;
          log(`neon   deleted ${b.projectName} / ${b.name}`);
        }
      } catch (e) {
        result.failures.push(`neon ${b.projectName}/${b.name}: ${message(e)}`);
      }
    }
  }

  return result;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The one-line summary. `staleSelected` is selected ids that were no longer in the inventory, which
 *  are also already gone. Every item lands in exactly one bucket, so the numbers add up. */
export function summarizeCleanup(res: CleanupResult, staleSelected = 0): string {
  const gone = res.alreadyGone + staleSelected;
  const waiting = res.rateLimited?.remaining ?? 0;
  return (
    `Deleted ${plural(res.vercelDeleted, "preview deployment", "preview deployments")} and ` +
    `${plural(res.neonDeleted, "Neon branch", "Neon branches")}; ${gone} already gone; ` +
    `${waiting} waiting on Vercel's limit; ${res.failures.length} failed.`
  );
}
