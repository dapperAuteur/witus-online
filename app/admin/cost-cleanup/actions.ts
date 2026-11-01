"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { cleanup, deploymentId, inventory, parseNeonProjectKeys, selectFromInventory, summarizeCleanup } from "@/lib/cost-cleanup";
import { getEnv } from "@/lib/env";

export interface CleanupActionState {
  ok: boolean;
  message: string;
  lines: string[];
  /** Set when Vercel's delete limit stopped the run. The page formats retryAt in the viewer's locale. */
  rateLimited?: { remaining: number; retryAt?: string };
  /** Ids the page keeps ticked for the next run: the deployments Vercel's limit kept this run from trying. */
  keepSelected?: string[];
}

/** Deletes exactly the ticked items. Admin-only. The inventory is re-read on the server and only ids
 *  still present in it are acted on, so the client cannot name anything the library would not list
 *  (production deployments and default/protected branches are never in the inventory). */
export async function deleteSelectedAction(_prev: CleanupActionState, formData: FormData): Promise<CleanupActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return { ok: false, message: "Not authorized.", lines: [] };
  }
  if (formData.get("confirm") !== "on") {
    return { ok: false, message: "Tick the confirmation box first.", lines: [] };
  }
  const ids = new Set(formData.getAll("ids").map(String));
  if (ids.size === 0) return { ok: false, message: "Nothing selected.", lines: [] };

  const env = getEnv();
  const creds = { vercelToken: env.VERCEL_TOKEN, neonProjectKeys: parseNeonProjectKeys(env.NEON_PROJECT_KEYS) };
  const full = await inventory(creds);
  const chosen = selectFromInventory(full, ids);
  const found = chosen.vercel.deployments.length + chosen.neon.branches.length;
  const lines: string[] = [];
  const res = await cleanup(creds, chosen, (l) => lines.push(l));
  revalidatePath("/admin/cost-cleanup");
  // Selected ids missing from a fresh inventory were deleted since the page loaded, unless the
  // inventory itself failed: then a missing id proves nothing and is not counted as gone.
  const stale = ids.size - found;
  const unchecked = full.errors.length ? stale : 0;
  const rl = res.rateLimited;
  return {
    ok: res.failures.length === 0,
    message:
      summarizeCleanup(res, stale - unchecked) +
      (unchecked ? ` ${unchecked} selected item(s) could not be checked because the inventory had errors.` : "") +
      (full.errors.length ? ` Inventory errors: ${full.errors.join("; ")}` : ""),
    lines: [...lines, ...res.failures.map((f) => `FAILED ${f}`)],
    rateLimited: rl ? { remaining: rl.remaining, retryAt: rl.retryAt } : undefined,
    keepSelected: rl ? rl.notAttempted.map(deploymentId) : [],
  };
}
