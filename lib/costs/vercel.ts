// Vercel costs for the last N days, by product and by project, from the same endpoint the Vercel
// CLI's `vercel usage` command calls (POST /v2/billing/costs, found in the CLI source 2026-10-15).
// Marketplace charges (Neon, Supabase, Upstash via Vercel) are NOT in this report: they are a
// separate invoice line. The credit ledger comes from /v1/invoices/pre-commitment-usage.
const BASE = "https://api.vercel.com";

export interface VercelCostLine { slug: string; title: string; cost: number; quantity: number; unit: string }
export interface VercelProjectCost { projectId: string; name: string; cost: number }
export interface VercelCostReport {
  teamId: string;
  teamSlug: string;
  plan?: string;
  from: string;
  to: string;
  total: number;
  byProduct: VercelCostLine[];
  byProject: VercelProjectCost[];
  credit?: { title: string; total: number; remaining: number; periodStart: string; periodEnd: string };
}

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`Vercel ${init?.method ?? "GET"} ${path.replace(/teamId=[^&]+/, "teamId=…")} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T;
}

export async function fetchVercelCosts(token: string, teamSlug: string, days = 30): Promise<VercelCostReport> {
  const teams = (await call<{ teams: { id: string; slug: string; billing?: { plan?: string } }[] }>(token, "/v2/teams")).teams;
  const team = teams.find((t) => t.slug === teamSlug);
  if (!team) throw new Error(`Vercel team "${teamSlug}" not found; have ${teams.map((t) => t.slug).join(", ")}`);
  const names = new Map<string, string>();
  let until: number | undefined;
  do {
    const d = await call<{ projects: { id: string; name: string }[]; pagination?: { next?: number } }>(token, `/v9/projects?teamId=${team.id}&limit=100${until ? `&until=${until}` : ""}`);
    for (const p of d.projects) names.set(p.id, p.name);
    until = d.pagination?.next ?? undefined;
  } while (until);

  const to = new Date();
  const from = new Date(to.getTime() - days * 864e5);
  const body = {
    from: from.toISOString(),
    to: to.toISOString(),
    metrics: ["gross_cost", "quantity"],
    format: "scalar",
    views: { summary: { groupBy: ["product"] }, detail: { groupBy: ["product", "project"] } },
    userAgent: "witus-admin-costs",
  };
  type Row = { metrics: string[]; dimensionValues: { product?: string; project?: string | null }; totalValue?: number[]; values?: number[][] };
  const res = await call<{ metrics: { slug: string; title: string; unit?: { kind?: string; singular?: string; name?: string } }[]; results: { views: { summary: { results: Row[] }; detail: { results: Row[] } } } }>(token, `/v2/billing/costs?teamId=${team.id}`, { method: "POST", body: JSON.stringify(body) });
  const meta = new Map(res.metrics.map((m) => [m.slug, m]));
  const total = (r: Row): [number, number] => {
    if (r.totalValue) return [Number(r.totalValue[0]) || 0, Number(r.totalValue[1]) || 0];
    if (r.values) return r.values.reduce<[number, number]>((a, v) => [a[0] + (Number(v[0]) || 0), a[1] + (Number(v[1]) || 0)], [0, 0]);
    return [0, 0];
  };
  const byProduct: VercelCostLine[] = [];
  for (const r of res.results.views.summary.results) {
    const slug = r.dimensionValues.product ?? "unknown";
    const [cost, quantity] = total(r);
    if (cost === 0 && quantity === 0) continue;
    const m = meta.get(slug);
    byProduct.push({ slug, title: m?.title ?? slug, cost, quantity, unit: m?.unit?.singular ?? m?.unit?.name ?? "" });
  }
  byProduct.sort((a, b) => b.cost - a.cost);
  const perProject = new Map<string, number>();
  for (const r of res.results.views.detail.results) {
    const pid = r.dimensionValues.project ?? "";
    const [cost] = total(r);
    if (!cost) continue;
    perProject.set(pid, (perProject.get(pid) ?? 0) + cost);
  }
  const byProject = [...perProject].map(([projectId, cost]) => ({ projectId, name: names.get(projectId) ?? (projectId ? projectId : "(unattributed)"), cost })).sort((a, b) => b.cost - a.cost);

  let credit: VercelCostReport["credit"];
  try {
    const led = await call<{ creditLedgers?: { title: string; total: number; remaining: number; periodStart: string; periodEnd: string }[] }>(token, `/v1/invoices/pre-commitment-usage?teamId=${team.id}`);
    const l = led.creditLedgers?.[0];
    if (l) credit = { title: l.title, total: Number(l.total) || 0, remaining: Number(l.remaining) || 0, periodStart: l.periodStart, periodEnd: l.periodEnd };
  } catch {
    /* credit ledger is optional */
  }
  return { teamId: team.id, teamSlug, plan: team.billing?.plan, from: from.toISOString(), to: to.toISOString(), total: byProduct.reduce((a, l) => a + l.cost, 0), byProduct, byProject, credit };
}

export interface VercelStore { id: string; name: string; type: string; product: string; plan?: string; planId?: string; projectCount: number; status?: string }

/** Marketplace resources (Neon, Supabase, Upstash, Prisma, Blob) with the plan each is on. */
export async function fetchVercelStores(token: string, teamId: string): Promise<VercelStore[]> {
  const list = await call<{ stores: { id: string; name: string; type: string }[] }>(token, `/v1/storage/stores?teamId=${teamId}`);
  const out: VercelStore[] = [];
  for (const s of list.stores ?? []) {
    try {
      const d = await call<{ store?: Record<string, unknown> }>(token, `/v1/storage/stores/${s.id}?teamId=${teamId}`);
      const st = (d.store ?? d) as { product?: { name?: string; slug?: string }; billingPlan?: { id?: string; name?: string }; status?: string; projectsMetadata?: unknown[] };
      const product = st.product?.name ?? st.product?.slug ?? (s.type === "blob" ? "Vercel Blob" : s.type);
      out.push({ id: s.id, name: s.name, type: s.type, product, plan: st.billingPlan?.name, planId: st.billingPlan?.id, projectCount: (st.projectsMetadata ?? []).length, status: st.status });
    } catch (e) {
      out.push({ id: s.id, name: s.name, type: s.type, product: s.type, projectCount: 0, status: `error: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return out;
}
