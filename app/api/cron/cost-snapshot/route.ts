// GET /api/cron/cost-snapshot — the daily cost collection (vercel.json cron, 06:00 UTC). Vercel
// attaches `Authorization: Bearer ${CRON_SECRET}` to cron invocations; anything else is a flat 401.
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { collectCosts } from "@/lib/costs/collect";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const env = getEnv();
  if (!env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await collectCosts(getDb(), env);
  return NextResponse.json({ ok: result.errors.length === 0, ...result });
}
