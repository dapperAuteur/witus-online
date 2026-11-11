import "server-only";
import { isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { doraAlarms } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { sendMail } from "@/lib/mailgun";
import { alarmCandidates, ALARM_AFTER_MS } from "./dora-core.mjs";
import { loadDoraOverview } from "./dora";

/**
 * The failed-deploy alarm (docs/02-dora-metrics.md, "The alarm"). Run hourly by
 * .github/workflows/dora-alarm.yml through /api/cron/dora-alarm. A Production deployment or a
 * post-deploy workflow that has been failed for more than 60 minutes, with no later green
 * deployment of that app, sends ONE email to ADMIN_EMAIL through Mailgun. dora_alarms keys each
 * failure by (app, sha, kind) so it never repeats; a failed send leaves sent_at null and the next
 * hour retries. Rows whose app is green again get resolved_at, which clears the Deploys banner.
 */

export const SITE = "https://www.witus.online";

export type AlarmRun = {
  /** Open failures older than 60 minutes right now. */
  alarms: number;
  sent: number;
  alreadySent: number;
  resolved: number;
  errors: string[];
};

export type AlarmResult =
  | { ok: true; data: AlarmRun }
  | { ok: false; error: string; code: string; data?: AlarmRun };

const kindLabel = (kind: string) => (kind === "deploy" ? "Production deployment" : `Post-deploy workflow "${kind.replace(/^workflow:/, "")}"`);

const utc = (ms: number) => `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

type Candidate = ReturnType<typeof alarmCandidates>[number];

function message(c: Candidate, now: number) {
  const minutes = Math.round((now - c.failedAt) / 60_000);
  const lines = [
    `${c.name} has been failing in production for ${minutes} minutes, with no later green deployment.`,
    "",
    `What failed: ${kindLabel(c.kind)}${c.detail ? ` (${c.detail})` : ""}`,
    `Commit: ${c.sha.slice(0, 7)} https://github.com/${c.repo}/commit/${c.sha}`,
    `Failed since: ${utc(c.failedAt)}`,
    c.url ? `Failure log: ${c.url}` : null,
    `Deploys: ${SITE}/admin/tasks/deploys`,
    `DORA: ${SITE}/admin/dora`,
    "",
    "This is the only email for this failure. The next one comes only if a different deploy or workflow fails.",
  ];
  return {
    subject: `[WitUS alarm] ${c.name}: ${kindLabel(c.kind)} failed ${minutes} min ago`,
    text: lines.filter((l) => l != null).join("\n"),
    detail: `${kindLabel(c.kind)}${c.detail ? `: ${c.detail}` : ""}${c.url ? ` (${c.url})` : ""}`,
  };
}

const key = (r: { app: string; sha: string; kind: string }) => `${r.app}\n${r.sha}\n${r.kind}`;

/** One alarm check. Never throws; every failure is a labelled result. */
export async function runDoraAlarm(db: Db, now = Date.now()): Promise<AlarmResult> {
  const env = getEnv();
  const overview = await loadDoraOverview();
  if (!overview.tokenSet) {
    return { ok: false, error: "GITHUB_ROADMAP_TOKEN is not set on this deployment, so deploys cannot be read (task 132).", code: "github_token_missing" };
  }
  const candidates = alarmCandidates(
    overview.apps.map((a) => ({ slug: a.slug, name: a.name, repo: a.repo, episodes: a.timeline.episodes })),
    now,
    ALARM_AFTER_MS,
  );
  const openKeys = new Set(
    overview.apps.flatMap((a) => a.timeline.episodes.filter((e) => e.end == null).map((e) => key({ app: a.slug, sha: e.sha, kind: e.kind }))),
  );

  let existing: (typeof doraAlarms.$inferSelect)[];
  try {
    existing = await db.select().from(doraAlarms);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .*dora_alarms.* does not exist/i.test(msg)) {
      return { ok: false, error: "The dora_alarms table is not in this database yet (migration 0011 runs on merge).", code: "no_table" };
    }
    return { ok: false, error: `Could not read dora_alarms (${err instanceof Error ? err.name : "unknown error"}).`, code: "db_error" };
  }
  const byKey = new Map(existing.map((r) => [key(r), r]));

  const run: AlarmRun = { alarms: candidates.length, sent: 0, alreadySent: 0, resolved: 0, errors: [] };
  const mailReady = Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);

  for (const c of candidates) {
    const row = byKey.get(key({ app: c.app, sha: c.sha, kind: c.kind }));
    if (row?.sentAt) {
      run.alreadySent += 1;
      continue;
    }
    const m = message(c, now);
    let sentAt: Date | null = null;
    if (!mailReady) {
      run.errors.push(`${c.name}: not emailed, Mailgun is not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN).`);
    } else {
      const res = await sendMail({ to: env.ADMIN_EMAIL, from: env.EMAIL_FROM, subject: m.subject, text: m.text, headers: { "X-Witus-Alarm": "dora" } });
      if (res.ok) {
        sentAt = new Date(now);
        run.sent += 1;
      } else run.errors.push(`${c.name}: the email was not sent (${(res.detail ?? "Mailgun error").slice(0, 120)}).`);
    }
    try {
      await db
        .insert(doraAlarms)
        .values({ app: c.app, sha: c.sha, kind: c.kind, failedAt: new Date(c.failedAt), sentAt, detail: m.detail })
        .onConflictDoUpdate({
          target: [doraAlarms.app, doraAlarms.sha, doraAlarms.kind],
          set: { sentAt: sql`coalesce(${doraAlarms.sentAt}, excluded.sent_at)`, detail: m.detail, resolvedAt: null },
        });
    } catch (err) {
      run.errors.push(`${c.name}: the alarm row was not saved (${err instanceof Error ? err.name : "unknown error"}).`);
    }
  }

  // Resolve rows whose failure is no longer open, only where this read could have seen it: the
  // app's deployments were read, and for a workflow alarm its workflow runs were read too.
  const appsBySlug = new Map(overview.apps.map((a) => [a.slug, a]));
  for (const r of existing) {
    const a = appsBySlug.get(r.app);
    if (r.resolvedAt || !a?.readOk || openKeys.has(key(r))) continue;
    if (r.kind.startsWith("workflow:") && a.actions !== "ok") continue;
    try {
      await db
        .update(doraAlarms)
        .set({ resolvedAt: new Date(now) })
        .where(sql`${doraAlarms.app} = ${r.app} and ${doraAlarms.sha} = ${r.sha} and ${doraAlarms.kind} = ${r.kind} and ${doraAlarms.resolvedAt} is null`);
      run.resolved += 1;
    } catch (err) {
      run.errors.push(`Could not resolve an alarm for ${r.app} (${err instanceof Error ? err.name : "unknown error"}).`);
    }
  }

  if (run.errors.length > 0) return { ok: false, error: run.errors.join(" "), code: mailReady ? "partial_failure" : "mail_not_configured", data: run };
  return { ok: true, data: run };
}

export type OpenAlarm = { app: string; sha: string; kind: string; failedAt: Date; sentAt: Date | null; detail: string | null };

/**
 * Unresolved alarms for the Deploys tab banner, from the database only (no GitHub read). Empty when
 * the table is not there yet, so the banner never breaks the page.
 */
export async function openAlarms(db: Db): Promise<OpenAlarm[]> {
  try {
    const rows = await db.select().from(doraAlarms).where(isNull(doraAlarms.resolvedAt));
    return rows.map((r) => ({ app: r.app, sha: r.sha, kind: r.kind, failedAt: r.failedAt, sentAt: r.sentAt, detail: r.detail }));
  } catch {
    return [];
  }
}

export { kindLabel };
