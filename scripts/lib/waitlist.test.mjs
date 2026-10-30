// Alpha waitlist (BAM, 2026-10-30): Invest.WitUS and RealEstate.WitUS moved to "alpha" with
// waitlist signups on witus.online. Covers the alpha-only gate, the submission sent to WitUS Inbox
// (with a mock sender), the honeypot, the per-IP rate limit, and validation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HONEYPOT_FIELD,
  RATE_LIMIT,
  alphaProduct,
  alphaProducts,
  buildWaitlistSubmission,
  clientIp,
  createRateLimiter,
  parseWaitlistFields,
  submitWaitlist,
  waitlistFormType,
  waitlistHref,
} from "../../lib/waitlist/waitlist.mjs";

const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const PRODUCTS = [
  { slug: "invest-witus", name: "Invest.WitUS", status: "alpha" },
  { slug: "realestate-witus", name: "RealEstate.WitUS", status: "alpha" },
  { slug: "vogoat", name: "VO GOAT", status: "coming-soon" },
  { slug: "fly-witus", name: "Fly.WitUS", status: "beta" },
  { slug: "centenarianos", name: "CentenarianOS", status: "live" },
  { slug: "witus-inbox", name: "WitUS Inbox", status: "infrastructure" },
];

const FIELDS = { email: "  person@example.com ", name: " Pat ", use: " Learn one method ", honeypot: "" };

/** A run of submitWaitlist with a recording mock sender; overrides replace any dependency. */
async function run(overrides = {}) {
  const sent = [];
  const result = await submitWaitlist({
    products: PRODUCTS,
    slug: "invest-witus",
    fields: FIELDS,
    ip: "203.0.113.7",
    limiter: createRateLimiter(RATE_LIMIT),
    verifyBot: async () => true,
    send: async (submission) => {
      sent.push(submission);
      return { ok: true, status: 200 };
    },
    ...overrides,
  });
  return { result, sent };
}

// ---- alpha-only gate ----

test("only alpha products have a waitlist", () => {
  assert.equal(alphaProduct(PRODUCTS, "invest-witus")?.slug, "invest-witus");
  assert.equal(alphaProduct(PRODUCTS, "realestate-witus")?.slug, "realestate-witus");
  for (const slug of ["vogoat", "fly-witus", "centenarianos", "witus-inbox", "nope", "", null, undefined]) {
    assert.equal(alphaProduct(PRODUCTS, slug), null, String(slug));
  }
  assert.deepEqual(alphaProducts(PRODUCTS).map((p) => p.slug), ["invest-witus", "realestate-witus"]);
  assert.equal(waitlistHref("invest-witus"), "/waitlist/invest-witus");
});

test("submitting to a non-alpha product is refused and nothing is sent", async () => {
  for (const slug of ["vogoat", "fly-witus", "centenarianos", "witus-inbox", "unknown"]) {
    const { result, sent } = await run({ slug });
    assert.equal(result.ok, false, slug);
    assert.equal(result.code, "not_alpha", slug);
    assert.equal(sent.length, 0, slug);
  }
});

test("the waitlist page 404s for every non-alpha slug", () => {
  const page = src("app/waitlist/[slug]/page.tsx");
  assert.match(page, /export const dynamicParams = false;/);
  assert.match(page, /alphaProducts\(products\)\.map/);
  assert.match(page, /if \(!product\) notFound\(\);/);
});

test("the registry puts Invest.WitUS and RealEstate.WitUS in alpha", () => {
  const registry = src("lib/products.ts");
  for (const slug of ["invest-witus", "realestate-witus"]) {
    const start = registry.indexOf(`slug: "${slug}"`);
    assert.ok(start > 0, slug);
    const entry = registry.slice(start, registry.indexOf("\n  },", start));
    assert.match(entry, /status: "alpha"/, slug);
  }
  assert.match(registry, /export type ProductStatus = [^;]*"alpha"/);
});

// ---- payload sent to Inbox ----

test("payload shape sent to Inbox", async () => {
  const { result, sent } = await run();
  assert.equal(result.ok, true);
  assert.match(result.data.message, /Invest\.WitUS waitlist/);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    form_type: "invest-witus-waitlist",
    priority: "normal",
    submitter_email: "person@example.com",
    submitter_name: "Pat",
    payload: {
      product: "invest-witus",
      product_name: "Invest.WitUS",
      stage: "alpha",
      use_case: "Learn one method",
      page: "https://witus.online/waitlist/invest-witus",
    },
  });
});

test("form type follows the <product>-waitlist pattern and fits the contract", () => {
  assert.equal(waitlistFormType("realestate-witus"), "realestate-witus-waitlist");
  const s = buildWaitlistSubmission(PRODUCTS[1], { email: "a@b.co", name: "", use: "" });
  assert.match(s.form_type, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(s.form_type.length <= 120);
  assert.equal("submitter_name" in s, false, "an empty name is omitted (contract: 1..255 chars when present)");
  assert.equal(s.payload.product, "realestate-witus");
  assert.equal(s.payload.use_case, "");
});

test("a failed or throwing send is an error, not a thank-you", async () => {
  const failed = await run({ send: async () => ({ ok: false, status: 401 }) });
  assert.equal(failed.result.ok, false);
  assert.equal(failed.result.code, "inbox_failed");
  const thrown = await run({
    send: async () => {
      throw new Error("network");
    },
  });
  assert.equal(thrown.result.ok, false);
  assert.equal(thrown.result.code, "inbox_failed");
});

// ---- honeypot ----

test("a filled honeypot gets a quiet success and nothing is sent", async () => {
  assert.equal(HONEYPOT_FIELD, "website");
  const { result, sent } = await run({ fields: { ...FIELDS, honeypot: "https://spam.example" } });
  assert.equal(result.ok, true);
  assert.equal(sent.length, 0);
});

test("the form renders the honeypot hidden from people and assistive tech", () => {
  const form = src("app/waitlist/[slug]/waitlist-form.tsx");
  assert.match(form, /name=\{HONEYPOT_FIELD\}/);
  assert.match(form, /aria-hidden="true"/);
  assert.match(form, /tabIndex=\{-1\}/);
});

// ---- rate limit ----

test("rate limiter: allows the limit, blocks the next, per key, and frees up after the window", () => {
  let t = 1_000_000;
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
  assert.equal(limiter.consume("a").allowed, true);
  assert.equal(limiter.consume("a").allowed, true);
  assert.equal(limiter.consume("a").remaining, 0);
  assert.equal(limiter.consume("a").allowed, false);
  assert.equal(limiter.consume("b").allowed, true, "another IP has its own bucket");
  t += 60_000;
  assert.equal(limiter.consume("a").allowed, true, "the window slides");
});

test("rate limiter prunes idle keys once it grows past maxKeys", () => {
  let t = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 10, now: () => t, maxKeys: 2 });
  limiter.consume("a");
  limiter.consume("b");
  t = 100;
  limiter.consume("c");
  assert.equal(limiter.size(), 1);
});

test("the sixth signup in an hour from one IP is refused before anything is sent", async () => {
  const limiter = createRateLimiter(RATE_LIMIT);
  const sent = [];
  const send = async (s) => {
    sent.push(s);
    return { ok: true, status: 200 };
  };
  for (let i = 0; i < RATE_LIMIT.limit; i++) {
    const { result } = await run({ limiter, send });
    assert.equal(result.ok, true);
  }
  let botChecked = false;
  const { result } = await run({
    limiter,
    send,
    verifyBot: async () => {
      botChecked = true;
      return true;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "rate_limited");
  assert.equal(botChecked, false);
  assert.equal(sent.length, RATE_LIMIT.limit);
});

test("client IP comes from the first x-forwarded-for entry, then x-real-ip", () => {
  const h = (o) => ({ get: (k) => o[k] ?? null });
  assert.equal(clientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIp(h({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientIp(h({})), "unknown");
});

// ---- bot check and validation ----

test("a failed bot check is refused and nothing is sent", async () => {
  const { result, sent } = await run({ verifyBot: async () => false });
  assert.equal(result.code, "bot_check_failed");
  assert.equal(sent.length, 0);
});

test("validation: email required and well formed; optional fields have limits", async () => {
  assert.equal(parseWaitlistFields({}).code, "email_required");
  assert.equal(parseWaitlistFields({ email: "not-an-email" }).code, "email_invalid");
  assert.equal(parseWaitlistFields({ email: "a@b.co", name: "x".repeat(121) }).code, "name_too_long");
  assert.equal(parseWaitlistFields({ email: "a@b.co", use: "x".repeat(501) }).code, "use_too_long");
  assert.deepEqual(parseWaitlistFields({ email: " a@b.co " }), { ok: true, data: { email: "a@b.co", name: "", use: "" } });
  const { result, sent } = await run({ fields: { email: "" } });
  assert.equal(result.field, "email");
  assert.equal(sent.length, 0);
});

// ---- cards ----

test("alpha cards link to the waitlist; the status maps cover alpha", () => {
  const card = src("components/ProductCard.tsx");
  assert.match(card, /alpha: "Alpha"/);
  assert.match(card, /href=\{waitlistHref\(slug\)\}/);
  assert.match(card, /label=\{`Join the \$\{name\} waitlist`\}/);
});
