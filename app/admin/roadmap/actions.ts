"use server";

import { revalidatePath, updateTag } from "next/cache";
import { isAdminRequest } from "@/lib/admin-auth";
import { ROADMAP_CACHE_TAG } from "@/lib/roadmap/github";

/** Shared envelope (docs/shared-ui-ux-dx.md); null before the first click. */
export type RefreshResult =
  | { ok: true; data: { refreshedAt: string } }
  | { ok: false; error: string; code: string }
  | null;

/** Expire the cached GitHub reads so the next render fetches every roadmap again. */
export async function refreshRoadmapAction(_prev: RefreshResult, _formData: FormData): Promise<RefreshResult> {
  if (!(await isAdminRequest())) return { ok: false, error: "Not authorized.", code: "forbidden" };
  updateTag(ROADMAP_CACHE_TAG);
  revalidatePath("/admin/roadmap", "layout");
  return { ok: true, data: { refreshedAt: new Date().toISOString() } };
}
