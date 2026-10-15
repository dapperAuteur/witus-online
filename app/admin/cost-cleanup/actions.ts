"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { cleanup, inventory } from "@/lib/cost-cleanup";
import { getEnv } from "@/lib/env";

export const CONFIRM_PHRASE = "delete previews";

export interface CleanupActionState {
  ok: boolean;
  message: string;
  lines: string[];
}

/** Deletes every Vercel preview deployment and every Neon `preview/*` branch the inventory lists.
 *  Admin-only, and only when the typed phrase matches. Production is never touched by construction
 *  (lib/cost-cleanup lists preview targets and preview-named, non-default, non-protected branches only). */
export async function runCleanupAction(_prev: CleanupActionState, formData: FormData): Promise<CleanupActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return { ok: false, message: "Not authorized.", lines: [] };
  }
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== CONFIRM_PHRASE) {
    return { ok: false, message: `Type "${CONFIRM_PHRASE}" to confirm.`, lines: [] };
  }
  const env = getEnv();
  const creds = { vercelToken: env.VERCEL_TOKEN, neonApiKey: env.NEON_API_KEY };
  const inv = await inventory(creds);
  const lines: string[] = [];
  const res = await cleanup(creds, inv, (l) => lines.push(l));
  revalidatePath("/admin/cost-cleanup");
  return {
    ok: res.failures.length === 0,
    message: `Deleted ${res.vercelDeleted} Vercel preview deployment(s) and ${res.neonDeleted} Neon preview branch(es). ${res.failures.length} failure(s).${inv.errors.length ? ` Inventory errors: ${inv.errors.join("; ")}` : ""}`,
    lines: [...lines, ...res.failures.map((f) => `FAILED ${f}`)],
  };
}
