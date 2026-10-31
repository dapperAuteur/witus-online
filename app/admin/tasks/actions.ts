"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { setTaskDone } from "@/lib/operator-tasks/queries";

/** Shared envelope (docs/shared-ui-ux-dx.md); null before the first click. */
export type TaskActionResult =
  | { ok: true; data: { key: string; at: string } }
  | { ok: false; error: string; code: string }
  | null;

async function toggle(formData: FormData, done: boolean): Promise<TaskActionResult> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) return { ok: false, error: "Not authorized.", code: "forbidden" };
  const key = formData.get("key");
  if (typeof key !== "string" || key.length === 0 || key.length > 600) {
    return { ok: false, error: "Missing task.", code: "bad_request" };
  }
  try {
    const changed = await setTaskDone(getDb(), key, email.toLowerCase(), done);
    if (!changed) {
      return {
        ok: false,
        error: done ? "Already marked done, or a sync removed this task." : "Not marked done, or a sync removed this task.",
        code: "not_found",
      };
    }
  } catch (err) {
    return { ok: false, error: `Could not save (${err instanceof Error ? err.name : "unknown error"}).`, code: "db_error" };
  }
  revalidatePath("/admin/tasks");
  return { ok: true, data: { key, at: new Date().toISOString() } };
}

/** "Mark done": records BAM's done with a timestamp and an audit row. The local sync reconciles. */
export async function markTaskDoneAction(_prev: TaskActionResult, formData: FormData): Promise<TaskActionResult> {
  return toggle(formData, true);
}

/** "Undo": clears a done mark made by mistake (also audited). */
export async function undoTaskDoneAction(_prev: TaskActionResult, formData: FormData): Promise<TaskActionResult> {
  return toggle(formData, false);
}
