// Waitlist signups for alpha products (BAM, 2026-10-30): Invest.WitUS and RealEstate.WitUS moved
// from "coming soon" to "alpha", and their cards on witus.online lead to /waitlist/<slug>.
//
// Signups go to WitUS Inbox under this site's existing source (INBOX_SOURCE_SLUG, `witus-online`)
// with form_type `<product-slug>-waitlist` (the `bvc-pilot-signup` / `bvc-feedback` pattern:
// product prefix, then the form) and the product slug repeated in the payload, so the Inbox can
// filter by exact form type, by its "Waitlist signups" kind chip, or by payload.
//
// Plain JS (allowJs) with no imports so `npm test` (node --test over scripts/lib/*.test.mjs) can
// exercise it without a TypeScript loader. The server action is app/waitlist/[slug]/actions.ts.

/** Hidden field a person never sees or fills. A value in it means a bot filled the form. */
export const HONEYPOT_FIELD = "website";

export const EMAIL_MAX = 254;
export const NAME_MAX = 120;
export const USE_MAX = 500;

/** Per-IP limit on submissions: generous for a person, tight for a script. */
export const RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

/** @param {string} slug */
export function waitlistHref(slug) {
  return `/waitlist/${slug}`;
}

/** @param {string} slug */
export function waitlistFormType(slug) {
  return `${slug}-waitlist`;
}

/**
 * The product a waitlist page or submission is for, or null. Only products whose status is
 * "alpha" have a waitlist: every other slug (live, beta, coming-soon, infrastructure, unknown)
 * gets null, which the page turns into a 404 and the action into an error.
 *
 * @template {{ slug: string, status: string }} P
 * @param {readonly P[]} products
 * @param {string | null | undefined} slug
 * @returns {P | null}
 */
export function alphaProduct(products, slug) {
  if (typeof slug !== "string" || !slug) return null;
  const product = products.find((p) => p.slug === slug);
  return product && product.status === "alpha" ? product : null;
}

/**
 * @template {{ slug: string, status: string }} P
 * @param {readonly P[]} products
 * @returns {P[]}
 */
export function alphaProducts(products) {
  return products.filter((p) => p.status === "alpha");
}

/** @param {unknown} value */
export function isHoneypotFilled(value) {
  return typeof value === "string" && value.trim() !== "";
}

/** @param {string} value */
export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * @typedef {{ email: string, name: string, use: string }} WaitlistFields
 * @typedef {{ ok: true, data: WaitlistFields } | { ok: false, error: string, code: string, field: "email" | "name" | "use" }} ParsedFields
 */

/**
 * Server-side validation. Email is required; name and "what would you use it for" are optional
 * and trimmed to their limits rather than rejected, except when they are far too long.
 *
 * @param {{ email?: unknown, name?: unknown, use?: unknown }} raw
 * @returns {ParsedFields}
 */
export function parseWaitlistFields(raw) {
  const str = (/** @type {unknown} */ v) => (typeof v === "string" ? v.trim() : "");
  const email = str(raw.email);
  const name = str(raw.name);
  const use = str(raw.use);

  if (!email) {
    return { ok: false, error: "Enter your email address.", code: "email_required", field: "email" };
  }
  if (email.length > EMAIL_MAX || !isEmail(email)) {
    return { ok: false, error: "That email address looks off. Please check it.", code: "email_invalid", field: "email" };
  }
  if (name.length > NAME_MAX) {
    return { ok: false, error: `Keep your name under ${NAME_MAX} characters.`, code: "name_too_long", field: "name" };
  }
  if (use.length > USE_MAX) {
    return { ok: false, error: `Keep this under ${USE_MAX} characters.`, code: "use_too_long", field: "use" };
  }
  return { ok: true, data: { email, name, use } };
}

/**
 * The submission sent to WitUS Inbox (docs/webhook-contract.md in claude/witus-inbox). Payload
 * keys are snake_case for the Inbox triage view. `submitter_name` is left out when empty because
 * the contract requires 1..255 characters when it is present.
 *
 * @param {{ slug: string, name: string }} product
 * @param {WaitlistFields} fields
 */
export function buildWaitlistSubmission(product, fields) {
  /** @type {{ form_type: string, priority: "normal", submitter_email: string, submitter_name?: string, payload: Record<string, unknown> }} */
  const submission = {
    form_type: waitlistFormType(product.slug),
    priority: "normal",
    submitter_email: fields.email,
    payload: {
      product: product.slug,
      product_name: product.name,
      stage: "alpha",
      use_case: fields.use,
      page: `https://witus.online${waitlistHref(product.slug)}`,
    },
  };
  if (fields.name) submission.submitter_name = fields.name;
  return submission;
}

/**
 * In-memory sliding-window limiter keyed by client IP. Best effort: on Vercel each warm function
 * instance keeps its own map, so the real ceiling is the limit times the number of instances. It
 * stops a single script hammering one instance; Turnstile does the rest.
 *
 * @param {{ limit: number, windowMs: number, now?: () => number, maxKeys?: number }} opts
 */
export function createRateLimiter({ limit, windowMs, now = Date.now, maxKeys = 5000 }) {
  /** @type {Map<string, number[]>} */
  const hits = new Map();
  return {
    /**
     * Records one attempt for `key` and says whether it is allowed.
     * @param {string} key
     * @returns {{ allowed: boolean, remaining: number }}
     */
    consume(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, remaining: 0 };
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > maxKeys) {
        for (const [k, times] of hits) {
          if (times.every((at) => t - at >= windowMs)) hits.delete(k);
        }
      }
      return { allowed: true, remaining: limit - recent.length };
    },
    size() {
      return hits.size;
    },
  };
}

/**
 * Client IP from proxy headers: the first `x-forwarded-for` entry (Vercel sets it), then
 * `x-real-ip`, then "unknown" (every header-less request shares one bucket, which fails safe).
 *
 * @param {{ get(name: string): string | null }} headers
 */
export function clientIp(headers) {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded ? forwarded.split(",")[0].trim() : "";
  if (first) return first;
  const real = headers.get("x-real-ip");
  return real && real.trim() ? real.trim() : "unknown";
}

/**
 * @typedef {{ ok: true, data: { message: string } } | { ok: false, error: string, code: string, field?: "email" | "name" | "use" }} WaitlistResult
 * @typedef {{ ok: boolean, status: number }} SendOutcome
 */

/**
 * The whole submission flow, with every side effect injected so tests can drive it:
 * alpha gate, honeypot (silent success, nothing sent), per-IP rate limit, bot check, validation,
 * then the send to Inbox. The send is awaited because Inbox is the only place a signup is kept:
 * if it fails the person is told to try again instead of being thanked for a signup that was lost.
 *
 * @param {{
 *   products: readonly { slug: string, name: string, status: string }[],
 *   slug: string,
 *   fields: { email?: unknown, name?: unknown, use?: unknown, honeypot?: unknown },
 *   ip: string,
 *   limiter: { consume(key: string): { allowed: boolean } },
 *   verifyBot: () => Promise<boolean>,
 *   send: (submission: ReturnType<typeof buildWaitlistSubmission>) => Promise<SendOutcome>,
 * }} args
 * @returns {Promise<WaitlistResult>}
 */
export async function submitWaitlist({ products, slug, fields, ip, limiter, verifyBot, send }) {
  const product = alphaProduct(products, slug);
  if (!product) {
    return { ok: false, error: "This waitlist is not open.", code: "not_alpha" };
  }

  const joined = {
    ok: /** @type {const} */ (true),
    data: { message: `You're on the ${product.name} waitlist. We'll email you when there's a spot.` },
  };

  if (isHoneypotFilled(fields.honeypot)) return joined;

  if (!limiter.consume(ip).allowed) {
    return {
      ok: false,
      error: "Too many signups from this connection. Please try again in an hour.",
      code: "rate_limited",
    };
  }

  if (!(await verifyBot())) {
    return { ok: false, error: "Bot check failed. Please try again or refresh the page.", code: "bot_check_failed" };
  }

  const parsed = parseWaitlistFields(fields);
  if (!parsed.ok) return parsed;

  let outcome;
  try {
    outcome = await send(buildWaitlistSubmission(product, parsed.data));
  } catch {
    outcome = { ok: false, status: 0 };
  }
  if (!outcome.ok) {
    return {
      ok: false,
      error: "Your signup didn't go through. Please try again in a few minutes.",
      code: "inbox_failed",
    };
  }
  return joined;
}
