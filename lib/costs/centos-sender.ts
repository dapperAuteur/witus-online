// Push the cost snapshot to CentenarianOS as signed X-Witus-* events (the ecosystem webhook
// contract: witus-inbox/docs/webhook-contract.md). CentOS receives at /api/events/vendor-bills and
// upserts on event_id, so re-sending the same period updates instead of duplicating. Fire-and-forget
// from the collector's point of view: a failure is reported, never retried here.
import { createHmac } from "node:crypto";

export interface VendorBillEvent {
  event_id: string;
  service_slug: string;
  service_name: string;
  vendor: string;
  plan?: string | null;
  billed_via?: string | null;
  period_start: string;
  period_end: string;
  base_fee?: number | null;
  usage_cost: number;
  currency: string;
  account_url?: string | null;
  witus_url: string;
  detail?: Record<string, unknown> | null;
}

export async function sendVendorBills(args: { url: string; secret: string; sourceSlug: string; events: VendorBillEvent[] }): Promise<{ ok: boolean; status: number; body: string }> {
  const rawBody = JSON.stringify({ events: args.events });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", args.secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const res = await fetch(args.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Witus-Source": args.sourceSlug,
      "X-Witus-Timestamp": timestamp,
      "X-Witus-Signature": `sha256=${signature}`,
    },
    body: rawBody,
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 300) };
}
