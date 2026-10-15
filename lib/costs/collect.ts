// One collection run: refresh the service registry and write a snapshot per service, then push the
// result to CentenarianOS. Called by the daily cron (/api/cron/cost-snapshot) and the Refresh button
// on /admin/costs. Tokens come from env through getEnv(); nothing here prints them.
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { services, serviceSnapshots } from "@/db/schema";
import { parseNeonProjectKeys } from "@/lib/cost-cleanup";
import { fetchNeonProjectUsage } from "./neon";
import { SEED_SERVICES } from "./registry-seed";
import { sendVendorBills, type VendorBillEvent } from "./centos-sender";
import { fetchVercelCosts, fetchVercelStores } from "./vercel";

export interface CollectEnv {
  VERCEL_TOKEN?: string;
  VERCEL_TEAM_SLUG?: string;
  NEON_PROJECT_KEYS?: string;
  CENTOS_EVENTS_URL?: string;
  CENTOS_EVENTS_SECRET?: string;
}
export interface CollectResult {
  servicesUpserted: number;
  snapshots: number;
  centos?: { ok: boolean; status: number; body: string };
  errors: string[];
}

const WITUS_COSTS_URL = "https://www.witus.online/admin/costs";
const day = (d: Date) => d.toISOString().slice(0, 10);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function collectCosts(db: Db, env: CollectEnv): Promise<CollectResult> {
  const result: CollectResult = { servicesUpserted: 0, snapshots: 0, errors: [] };
  const events: VendorBillEvent[] = [];
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 864e5);

  // 1. Manual seed rows: insert if missing, never overwrite what BAM edited.
  for (const s of SEED_SERVICES) {
    await db
      .insert(services)
      .values({ slug: s.slug, name: s.name, vendor: s.vendor, category: s.category, billedVia: s.billedVia, accountUrl: s.accountUrl, usageSource: "manual", usedBy: s.usedBy, notes: s.notes })
      .onConflictDoNothing();
  }

  // 2. Vercel: platform usage by product and project, plus the credit ledger.
  if (env.VERCEL_TOKEN) {
    try {
      const report = await fetchVercelCosts(env.VERCEL_TOKEN, env.VERCEL_TEAM_SLUG ?? "bam-apps", 30);
      const seats = report.byProduct.find((l) => l.slug === "teamSeats");
      await db
        .insert(services)
        .values({ slug: "vercel", name: `Vercel (team ${report.teamSlug})`, vendor: "Vercel", category: "hosting", billedVia: "direct", usageSource: "vercel", plan: report.plan ? report.plan[0].toUpperCase() + report.plan.slice(1) : null, externalId: report.teamId, accountUrl: `https://vercel.com/${report.teamSlug}/~/settings/billing`, lastVerifiedAt: now })
        .onConflictDoUpdate({ target: services.slug, set: { plan: report.plan ? report.plan[0].toUpperCase() + report.plan.slice(1) : null, externalId: report.teamId, usageSource: "vercel", lastVerifiedAt: now, updatedAt: now } });
      result.servicesUpserted++;
      await db.insert(serviceSnapshots).values({
        serviceSlug: "vercel",
        periodStart,
        periodEnd: now,
        usageCost: String(report.total - (seats?.cost ?? 0)),
        baseFee: seats ? String(seats.cost) : null,
        lines: report.byProduct.map((l) => ({ line: l.title, quantity: l.quantity, unit: l.unit, cost: l.cost })),
        detail: { byProject: report.byProject, credit: report.credit ?? null, from: report.from, to: report.to },
        source: "vercel:/v2/billing/costs",
      });
      result.snapshots++;
      events.push({ event_id: `vercel:${day(now)}`, service_slug: "vercel", service_name: `Vercel (team ${report.teamSlug})`, vendor: "Vercel", plan: report.plan ?? null, billed_via: "direct", period_start: day(periodStart), period_end: day(now), base_fee: seats?.cost ?? null, usage_cost: report.total - (seats?.cost ?? 0), currency: "USD", account_url: `https://vercel.com/${report.teamSlug}/~/settings/billing`, witus_url: WITUS_COSTS_URL, detail: { byProduct: report.byProduct.slice(0, 20), credit: report.credit ?? null } });

      // 3. Marketplace resources on the Vercel invoice: one service row per store, plan as reported.
      const stores = await fetchVercelStores(env.VERCEL_TOKEN, report.teamId);
      for (const st of stores) {
        const slug = `vercel-store-${slugify(st.name)}`;
        const name = `${st.product}: ${st.name}`;
        await db
          .insert(services)
          .values({ slug, name, vendor: st.product, category: st.type === "blob" ? "storage" : "database", billedVia: "vercel", usageSource: "vercel_store", plan: st.plan ?? null, externalId: st.id, accountUrl: `https://vercel.com/${report.teamSlug}/~/integrations`, usedBy: st.projectCount ? `${st.projectCount} project(s)` : "unlinked", active: st.status !== "uninstalled", lastVerifiedAt: now })
          .onConflictDoUpdate({ target: services.slug, set: { name, plan: st.plan ?? null, usedBy: st.projectCount ? `${st.projectCount} project(s)` : "unlinked", active: st.status !== "uninstalled", lastVerifiedAt: now, updatedAt: now } });
        result.servicesUpserted++;
        await db.insert(serviceSnapshots).values({ serviceSlug: slug, periodStart, periodEnd: now, usageCost: "0", lines: [{ line: `plan ${st.plan ?? "unknown"} (${st.planId ?? "?"})`, quantity: st.projectCount, unit: "project", cost: 0 }], detail: { status: st.status ?? null, planId: st.planId ?? null }, source: "vercel:/v1/storage/stores" });
        result.snapshots++;
      }
    } catch (e) {
      result.errors.push(`vercel: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 4. Neon, one project-scoped key per project.
  let keys: Record<string, string> | undefined;
  try {
    keys = parseNeonProjectKeys(env.NEON_PROJECT_KEYS);
  } catch (e) {
    result.errors.push(`neon keys: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const [projectId, key] of Object.entries(keys ?? {})) {
    try {
      const u = await fetchNeonProjectUsage(projectId, key);
      const slug = `neon-${projectId}`;
      await db
        .insert(services)
        .values({ slug, name: `Neon: ${u.name}`, vendor: "Neon", category: "database", billedVia: "vercel", usageSource: "neon", externalId: projectId, accountUrl: `https://console.neon.tech/app/projects/${projectId}`, lastVerifiedAt: now })
        .onConflictDoUpdate({ target: services.slug, set: { name: `Neon: ${u.name}`, lastVerifiedAt: now, updatedAt: now } });
      result.servicesUpserted++;
      const lines = [
        { line: "branches", quantity: u.branches, unit: "branch", cost: 0 },
        { line: "preview/* branches", quantity: u.previewBranches, unit: "branch", cost: 0 },
        ...(u.computeTimeSeconds != null ? [{ line: "compute time", quantity: Math.round(u.computeTimeSeconds / 36) / 100, unit: "CU-hour", cost: 0 }] : []),
        ...(u.storageBytes != null ? [{ line: "storage", quantity: Math.round(u.storageBytes / 1e7) / 100, unit: "GB", cost: 0 }] : []),
        ...(u.writtenDataBytes != null ? [{ line: "written data", quantity: Math.round(u.writtenDataBytes / 1e7) / 100, unit: "GB", cost: 0 }] : []),
      ];
      await db.insert(serviceSnapshots).values({ serviceSlug: slug, periodStart, periodEnd: now, usageCost: "0", lines, detail: { consumptionPeriodEnd: u.consumptionPeriodEnd ?? null }, source: "neon:/projects/{id}" });
      result.snapshots++;
    } catch (e) {
      result.errors.push(`neon ${projectId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 5. Manual services carry their own fee; send them too so CentOS sees the whole list.
  const manual = await db.select().from(services).where(eq(services.usageSource, "manual"));
  for (const m of manual) {
    if (!m.active) continue;
    events.push({ event_id: `${m.slug}:${day(now)}`, service_slug: m.slug, service_name: m.name, vendor: m.vendor, plan: m.plan, billed_via: m.billedVia, period_start: day(periodStart), period_end: day(now), base_fee: m.baseFeeMonthly ? Number(m.baseFeeMonthly) : null, usage_cost: 0, currency: m.currency, account_url: m.accountUrl, witus_url: WITUS_COSTS_URL, detail: null });
  }

  // 6. Push to CentenarianOS when configured.
  if (env.CENTOS_EVENTS_URL && env.CENTOS_EVENTS_SECRET && events.length) {
    try {
      result.centos = await sendVendorBills({ url: env.CENTOS_EVENTS_URL, secret: env.CENTOS_EVENTS_SECRET, sourceSlug: "witus-online", events });
      if (!result.centos.ok) result.errors.push(`centos: ${result.centos.status} ${result.centos.body}`);
    } catch (e) {
      result.errors.push(`centos: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

/** Registry joined with each service's latest snapshot, for the admin page. */
export async function latestCostRows(db: Db) {
  const rows = await db.execute(sql`
    select s.slug, s.name, s.vendor, s.category, s.plan, s.billed_via, s.base_fee_monthly, s.currency, s.account_url,
           s.usage_source, s.used_by, s.notes, s.active, s.last_verified_at,
           snap.usage_cost, snap.base_fee, snap.lines, snap.detail, snap.collected_at, snap.period_start, snap.period_end
    from service s
    left join lateral (
      select * from service_snapshot ss where ss.service_slug = s.slug order by ss.collected_at desc limit 1
    ) snap on true
    order by s.active desc, coalesce(snap.usage_cost, 0) + coalesce(snap.base_fee, s.base_fee_monthly, 0) desc, s.name asc
  `);
  return rows.rows as unknown as {
    slug: string; name: string; vendor: string; category: string; plan: string | null; billed_via: string; base_fee_monthly: string | null; currency: string; account_url: string | null;
    usage_source: string; used_by: string | null; notes: string | null; active: boolean; last_verified_at: string | null;
    usage_cost: string | null; base_fee: string | null; lines: { line: string; quantity: number; unit: string; cost: number }[] | null; detail: Record<string, unknown> | null; collected_at: string | null; period_start: string | null; period_end: string | null;
  }[];
}
