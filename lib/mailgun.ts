import "server-only";

export interface SendArgs {
  to: string;
  from: string;
  subject: string;
  text: string;
  /** Optional extra RFC 5322 / Mailgun custom headers (e.g. X-Witus-Form). */
  headers?: Record<string, string>;
  /** Optional reply-to override (e.g. educator's email). */
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  /** Provider message id when ok; human-readable error when not. */
  detail?: string;
}

/**
 * Thin Mailgun wrapper. No SDK; POSTs to api.mailgun.net with Basic auth.
 *
 * Dev-mode contract: if MAILGUN_API_KEY or MAILGUN_DOMAIN is missing we log
 * the payload to the server console and return ok: true so local forms
 * finish their submit flow without needing the real service.
 */
export async function sendMail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    console.warn(
      "[mailgun] MAILGUN_API_KEY or MAILGUN_DOMAIN missing. Logging payload instead of sending (dev mode)."
    );
    console.log("[mailgun:dev]", {
      to: args.to,
      from: args.from,
      subject: args.subject,
      replyTo: args.replyTo,
      headers: args.headers,
      text: args.text,
    });
    return { ok: true, detail: "dev-log" };
  }

  const body = new URLSearchParams();
  body.set("from", args.from);
  body.set("to", args.to);
  body.set("subject", args.subject);
  body.set("text", args.text);
  if (args.replyTo) body.set("h:Reply-To", args.replyTo);
  if (args.headers) {
    for (const [key, value] of Object.entries(args.headers)) {
      body.set(`h:${key}`, value);
    }
  }

  const auth = Buffer.from(`api:${apiKey}`).toString("base64");

  try {
    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        detail: `Mailgun ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as { id?: string; message?: string };
    return { ok: true, detail: data.id ?? data.message };
  } catch (err) {
    return { ok: false, detail: `Mailgun fetch failed: ${String(err)}` };
  }
}

/** BAM's catch-all destination for BVC form submissions. */
export const BVC_SUBMISSIONS_EMAIL = "bvc.witus.submissions@witus.online";

/**
 * Default From header so Mailgun routes via a witus.online sender.
 * MAILGUN_DOMAIN should be the subdomain you configured in Mailgun (often
 * literally witus.online per BAM's setup).
 */
export function bvcFromAddress(): string {
  const domain = process.env.MAILGUN_DOMAIN ?? "witus.online";
  return `WitUS Forms <forms@${domain}>`;
}
