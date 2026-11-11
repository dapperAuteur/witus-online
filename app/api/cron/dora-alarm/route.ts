// POST /api/cron/dora-alarm: the hourly failed-deploy alarm check (docs/02-dora-metrics.md). Called
// by .github/workflows/dora-alarm.yml with `Authorization: Bearer <CRON_SECRET>`, the same secret
// and header the Vercel cron route uses. GET answers the same way, so a by-hand curl works either way.
// Fails closed: no CRON_SECRET on this deployment is a labelled 503, a wrong or missing header a 401.
// Every answer is the shared envelope { ok: true, data } | { ok: false, error, code }.
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getEnv } from "@/lib/env";
import { runDoraAlarm } from "@/lib/ops/dora-alarm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handle(req: Request) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set on this deployment, so the alarm check is refused. Set it on Vercel and redeploy.", code: "cron_secret_missing" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized.", code: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDoraAlarm(getDb());
    const status = result.ok ? 200 : result.code === "github_token_missing" || result.code === "no_table" ? 503 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    // runDoraAlarm returns its failures; this is only for the unexpected. Name only, never the message.
    return NextResponse.json(
      { ok: false, error: `The alarm check failed unexpectedly (${err instanceof Error ? err.name : "unknown error"}).`, code: "internal" },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET = handle;
