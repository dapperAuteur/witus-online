"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { collectCosts } from "@/lib/costs/collect";
import { getEnv } from "@/lib/env";

export interface RefreshState { message: string; ok: boolean }

export async function refreshCostsAction(_prev: RefreshState, _formData: FormData): Promise<RefreshState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return { ok: false, message: "Not authorized." };
  const r = await collectCosts(getDb(), getEnv());
  revalidatePath("/admin/costs");
  return {
    ok: r.errors.length === 0,
    message: `Collected ${r.snapshots} snapshot(s) across ${r.servicesUpserted} service(s).${r.centos ? ` CentOS: ${r.centos.ok ? "updated" : `failed ${r.centos.status}`}.` : " CentOS push not configured."}${r.errors.length ? ` Errors: ${r.errors.join("; ")}` : ""}`,
  };
}
