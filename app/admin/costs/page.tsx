import { products } from "@/lib/products";
import { getDb } from "@/db";
import { latestCostRows } from "@/lib/costs/collect";
import { getEnv } from "@/lib/env";
import { RefreshButton } from "./RefreshButton";

export const dynamic = "force-dynamic";

// Owner page: every third-party service the ecosystem uses, the plan it is on, its fixed fee and its
// last-30-day usage cost, where to log in to verify, and a jump to the matching transactions in
// CentenarianOS (which shows the payment account). Refreshed daily by /api/cron/cost-snapshot and
// on demand here. Manual rows (fees, plans) are BAM's to fill; collector rows refresh themselves.
const money = (v: string | number | null | undefined, c = "USD") =>
  v == null || v === "" ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v));

export default async function CostsPage() {
  const env = getEnv();
  const rows = await latestCostRows(getDb());
  const centosHref = products.find((p) => p.slug === "centenarianos")?.href ?? "";
  const configured = { vercel: Boolean(env.VERCEL_TOKEN), neon: Boolean(env.NEON_PROJECT_KEYS), centos: Boolean(env.CENTOS_EVENTS_URL && env.CENTOS_EVENTS_SECRET), cron: Boolean(env.CRON_SECRET) };
  const vercel = rows.find((r) => r.slug === "vercel");
  const credit = (vercel?.detail as { credit?: { total: number; remaining: number; periodEnd: string } } | null)?.credit ?? null;
  const total = rows.filter((r) => r.active).reduce((s, r) => s + Number(r.usage_cost ?? 0) + Number(r.base_fee ?? r.base_fee_monthly ?? 0), 0);
  const lastCollected = rows.map((r) => r.collected_at).filter(Boolean).sort().at(-1) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ecosystem costs</h1>
          <p className="text-sm text-neutral-600">
            Every service, its plan, fixed fee, last-30-day usage, and where to log in. Collected daily at 06:00 UTC
            {lastCollected ? `; last run ${new Date(lastCollected).toISOString().slice(0, 16).replace("T", " ")} UTC` : "; not collected yet"}.
          </p>
        </div>
        <RefreshButton />
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded border p-3"><dt className="text-neutral-600">Latest-period total</dt><dd className="text-lg font-semibold">{money(total)}</dd></div>
        <div className="rounded border p-3"><dt className="text-neutral-600">Vercel credit</dt><dd>{credit ? `${money(credit.remaining)} of ${money(credit.total)} left until ${credit.periodEnd.slice(0, 10)}` : "no ledger"}</dd></div>
        <div className="rounded border p-3"><dt className="text-neutral-600">Collectors</dt><dd>Vercel {configured.vercel ? "on" : "off"} · Neon {configured.neon ? "on" : "off"} · cron {configured.cron ? "on" : "off"}</dd></div>
        <div className="rounded border p-3"><dt className="text-neutral-600">CentOS push</dt><dd>{configured.centos ? "on" : "off: set CENTOS_EVENTS_URL and CENTOS_EVENTS_SECRET"}</dd></div>
      </dl>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-600">
            <th className="py-2 pr-3">Service</th><th className="py-2 pr-3">Vendor</th><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Billed via</th>
            <th className="py-2 pr-3 text-right">Fee / month</th><th className="py-2 pr-3 text-right">Usage (30d)</th><th className="py-2 pr-3">Used by</th><th className="py-2 pr-3">Verified</th><th className="py-2">Links</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className={`border-b border-neutral-100 align-top ${r.active ? "" : "opacity-50"}`}>
              <td className="py-2 pr-3 font-medium">{r.name}{r.notes ? <div className="text-xs font-normal text-neutral-500">{r.notes}</div> : null}</td>
              <td className="py-2 pr-3">{r.vendor}</td>
              <td className="py-2 pr-3">{r.plan ?? <span className="text-neutral-400">verify</span>}</td>
              <td className="py-2 pr-3">{r.billed_via}</td>
              <td className="py-2 pr-3 text-right">{money(r.base_fee ?? r.base_fee_monthly, r.currency) || <span className="text-neutral-400">set</span>}</td>
              <td className="py-2 pr-3 text-right">{r.usage_source === "manual" ? "" : money(r.usage_cost, r.currency)}</td>
              <td className="py-2 pr-3 text-xs">{r.used_by ?? ""}</td>
              <td className="py-2 pr-3 text-xs">{r.last_verified_at ? String(r.last_verified_at).slice(0, 10) : <span className="text-neutral-400">never</span>}</td>
              <td className="py-2 whitespace-nowrap text-xs">
                {r.account_url ? <a className="text-teal-700 underline" href={r.account_url} target="_blank" rel="noreferrer">Account</a> : null}
                {centosHref ? <a className="ml-2 text-teal-700 underline" href={`${centosHref}/dashboard/finance/transactions?q=${encodeURIComponent(r.vendor)}`} target="_blank" rel="noreferrer">Transactions in CentOS</a> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {vercel?.lines?.length ? (
        <section>
          <h2 className="text-lg font-medium">Vercel, last 30 days by line</h2>
          <table className="mt-2 text-sm">
            <tbody>
              {vercel.lines.map((l) => (
                <tr key={l.line}><td className="pr-4">{l.line}</td><td className="pr-4 text-right">{l.quantity.toLocaleString()} {l.unit}</td><td className="text-right">{money(l.cost)}</td></tr>
              ))}
            </tbody>
          </table>
          {(vercel.detail as { byProject?: { name: string; cost: number }[] } | null)?.byProject?.length ? (
            <>
              <h3 className="mt-4 text-sm font-medium">By project</h3>
              <table className="mt-1 text-sm"><tbody>
                {(vercel.detail as { byProject: { name: string; cost: number }[] }).byProject.slice(0, 30).map((p) => (
                  <tr key={p.name}><td className="pr-4">{p.name}</td><td className="text-right">{money(p.cost)}</td></tr>
                ))}
              </tbody></table>
            </>
          ) : null}
        </section>
      ) : null}
      <p className="text-xs text-neutral-500">
        Plans and fees for manual rows are set in the database (service table) until an edit form exists; "verify" means nobody has checked the vendor yet. Marketplace charges (Neon, Supabase, Upstash) bill on the Vercel invoice and are not in the Vercel usage lines.
      </p>
    </div>
  );
}
