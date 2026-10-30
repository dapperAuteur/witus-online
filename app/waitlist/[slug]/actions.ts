"use server";

import { headers } from "next/headers";
import { sendToInbox } from "@/lib/inbox-sender";
import { products } from "@/lib/products";
import { TURNSTILE_FORM_FIELD, verifyTurnstile } from "@/lib/turnstile";
import {
  HONEYPOT_FIELD,
  RATE_LIMIT,
  clientIp,
  createRateLimiter,
  submitWaitlist,
  type WaitlistResult,
} from "@/lib/waitlist/waitlist.mjs";

// One limiter per warm server instance; see createRateLimiter for why that is good enough.
const limiter = createRateLimiter(RATE_LIMIT);

/**
 * Waitlist signup for an alpha product. The slug comes from a hidden field and is checked again
 * here, so posting to a product that is not in alpha fails even if someone crafts the request.
 * Logs carry the source, form type and HTTP status only, never the email, name, note, or IP.
 */
export async function joinWaitlistAction(
  _prev: WaitlistResult | null,
  formData: FormData,
): Promise<WaitlistResult> {
  const h = await headers();
  const field = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  const ip = clientIp(h);

  return submitWaitlist({
    products,
    slug: field("slug"),
    fields: {
      email: field("email"),
      name: field("name"),
      use: field("use"),
      honeypot: field(HONEYPOT_FIELD),
    },
    ip,
    limiter,
    verifyBot: () => verifyTurnstile(field(TURNSTILE_FORM_FIELD) || null, ip === "unknown" ? null : ip),
    send: async (submission) => {
      const inboxUrl = process.env.INBOX_INGEST_URL;
      const sourceSlug = process.env.INBOX_SOURCE_SLUG;
      const hmacSecret = process.env.INBOX_INGEST_SECRET;
      if (!inboxUrl || !sourceSlug || !hmacSecret) {
        console.error("[waitlist] inbox not configured", { form_type: submission.form_type });
        return { ok: false, status: 0 };
      }
      const result = await sendToInbox({ inboxUrl, sourceSlug, hmacSecret, submission });
      if (!result.ok) {
        console.error("[inbox-sender] failed", {
          source: sourceSlug,
          form_type: submission.form_type,
          http_status: result.status,
        });
      }
      return result;
    },
  });
}
