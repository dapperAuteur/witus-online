import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry `beforeSend` scrubber for WitUS.online.
 *
 * Why this file exists
 * --------------------
 * This repo is the ecosystem's IdP. A crash report from here can plausibly carry, in prose:
 *   - a NextAuth magic-link callback URL (`/api/auth/callback/email?token=...`) -> account takeover;
 *   - a Better Auth OIDC exchange (`/api/idp/oauth2/token`, `?code=`, `client_secret`) -> a client
 *     credential for a whole ecosystem app;
 *   - `EMAIL_SERVER` / `STORAGE_DATABASE_URL`, which are URIs with the PASSWORD IN THEM, and which
 *     land verbatim in a connection error's message;
 *   - the `X-Witus-Signature` HMAC we sign inbox/outbox webhooks with;
 *   - a signed-in learner's email address.
 * Shipping any of those to a third-party error host puts a working credential in a second, less
 * guarded place. So the report keeps the SHAPE of the failure and loses the credentials.
 *
 * The bias is deliberate: REDACT WHEN UNSURE. An over-redacted crash report costs a few minutes of
 * triage; an under-redacted one costs an account. This never returns null, though, because a
 * scrubbed crash is still a crash we want to know about.
 *
 * This repo has no shared redaction helper (unlike witus-learn's `lib/email-redact.ts`), so the
 * logic below is self-contained on purpose. It is also dependency-free at runtime: the only import
 * is a type, so `node --experimental-strip-types` can load this file directly. That is what
 * `scripts/check-sentry-scrub.mjs` does.
 */

/** Name segments that mean "this field holds a credential". Matched per SEGMENT rather than as a
 *  substring, because a substring test flags `design` (contains `sig`) and `keyboard` (contains
 *  `key`), and needless redaction of ordinary fields makes a report harder to read for no safety
 *  gain. `state` is deliberately ABSENT: it is a CSRF nonce rather than a bearer credential, and
 *  this site uses `?state=` for US states on public pages, which we would rather keep readable. */
const SECRET_WORDS = new Set([
  "token", "secret", "code", "otp", "passcode", "password", "passwd", "pwd", "pin", "key", "jwt",
  "sig", "signature", "hash", "hmac", "auth", "credential", "credentials", "session", "magic",
  "invite", "nonce", "assertion", "bearer", "dsn",
]);

/** Substrings strong enough to flag a name that does not split cleanly (`magiclink`, `apikey`). */
const SECRET_SUBSTRINGS = [
  "secret", "token", "password", "passwd", "passcode", "credential", "apikey", "magiclink",
];

/** Does this field / param name say it holds a credential? Splits on `_ - .` and camelCase, so
 *  `client_secret`, `clientSecret`, `X-Witus-Signature`, and `id_token_hint` all trip it while
 *  `design` and `keyboard` do not. */
export function isSecretName(name: string): boolean {
  const lower = name.toLowerCase();
  if (SECRET_SUBSTRINGS.some((s) => lower.includes(s))) return true;
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_.\-]+/)
    .some((seg) => SECRET_WORDS.has(seg.toLowerCase()));
}

/** Path prefixes that are credential endpoints BY CONSTRUCTION in this repo, redacted whether or
 *  not the token in them looks random. `/api/auth` is NextAuth (this site's own sign-in), `/api/idp`
 *  is the Better Auth OIDC provider we serve to the whole ecosystem, and the rest are the sign-in /
 *  verification surfaces around them. Tuned to THIS app's routes. */
const SECRET_PATH_RE =
  /^\/(api\/auth|api\/idp|api\/ingest|auth\/sign-in|auth\/verify-request|accounts\/sign-in|oauth2|\.well-known\/openid-configuration|jwks|magic-link|verify|callback|reset|reset-password|set-password|confirm|activate|unsubscribe)(\/|$)/i;

/** A path segment that looks like a generated token: long, and drawn from the alphabet our token
 *  generators use (hex / base64url / nanoid). Loose on purpose, to catch the future
 *  `/whatever/<token>` route nobody remembered to add above. */
const TOKENISH_SEGMENT_RE = /^[A-Za-z0-9_-]{16,}$/;

/** Absolute http(s) URLs. Trailing punctuation (a sentence-ending period, a closing bracket) is
 *  excluded so we replace the URL and not the prose around it. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

/** Any URI carrying inline `user:password@host` credentials. This is the one that matters most
 *  here: `EMAIL_SERVER` is an smtp:// URI and `STORAGE_DATABASE_URL` is a postgres:// URI, both
 *  with the password inline, and both appear verbatim in the message of a connection failure.
 *
 *  The userinfo group is GREEDY and allows `@`, because Mailgun's SMTP username is itself an email
 *  address: `smtp://postmaster@mg.witus.online:PASSWORD@smtp.mailgun.org:587`. A userinfo pattern
 *  that stopped at the first `@` matched none of that and left the password in the message. */
const CREDENTIALED_URI_RE = /\b([a-z][a-z0-9+.-]*):\/\/([^\s/]*:[^\s/]*)@([^\s<>"')\]]+)/gi;

/** JSON Web Tokens: id_token / access_token from the OIDC provider, and any Better Auth JWT.
 *  Anchored on the `eyJ` header (base64url of `{"`) so it cannot match ordinary dotted text. */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}(?:\.[A-Za-z0-9_-]+)?/g;

/** Email addresses. Every account here is keyed by email, so an address IS the account identifier
 *  and must not ride along in a message body. */
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * A raw secret that is NOT a URL: `password: hunter2`, `client_secret = abc`, `signature is
 * sha256=deadbeef`. The separator is REQUIRED, otherwise "pin down the answer" gets mangled in
 * every message, and there is no format in which we would emit a secret with no separator at all.
 */
const SECRET_LABEL_RE =
  /\b(pin|password|passcode|client[_\s-]?secret|api[_\s-]?key|secret[_\s-]?key|hmac|signature|bearer|authorization|one[-\s]?time code|access code|security code|verification code)\b\s*(?:is|:|=|->)\s*([^\s.,;)"'}\]]{3,})/gi;

/**
 * A SCREAMING_SNAKE env var whose NAME says it holds a credential, assigned a value. Catches every
 * secret in this repo's `.env.example` by shape rather than by list: NEXTAUTH_SECRET,
 * INBOX_INGEST_SECRET, TURNSTILE_SECRET_KEY, MAILGUN_API_KEY, OUTBOX_PODCAST_*_SECRET,
 * STORAGE_DATABASE_URL, SENTRY_AUTH_TOKEN, and any future sibling.
 */
const ENV_SECRET_RE =
  /\b([A-Z][A-Z0-9_]*(?:SECRET|KEY|TOKEN|PASSWORD|PWD|DSN|CREDENTIALS?|DATABASE_URL|EMAIL_SERVER)[A-Z0-9_]*)\s*[:=]\s*([^\s,;)"'}\]]{3,})/g;

/** A bare `sha256=<hex>` HMAC, the shape of the `X-Witus-Signature` header this app signs inbox and
 *  outbox webhooks with. */
const HMAC_RE = /\b(sha\d{3})=([A-Fa-f0-9]{16,})/g;

/**
 * Any `name=value` / `name: value` pair at all, so the NAME can be tested against
 * isSecretName(). This is what catches a NAKED query string (`code=...&client_secret=...`), which
 * is what `event.request.query_string` is: it is not a URL, so URL_RE never sees it, and the two
 * leaks this caught on its first run were exactly that plus a `client_secret` object key.
 */
const KEY_VALUE_RE = /(["']?)([A-Za-z_][A-Za-z0-9_.-]{1,40})\1\s*([:=])\s*(["']?)([^\s&,;)"'}\]]{3,})/g;

export const REDACTED = "[redacted link]";
export const REDACTED_SECRET = "[redacted]";
export const REDACTED_EMAIL = "[redacted email]";

/**
 * Is this URL carrying a secret that must never leave the building?
 *
 * Returns TRUE (redact) for anything unparseable, which is exactly the case where we cannot reason
 * about it, and the rule is redact when unsure.
 */
export function isSensitiveUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true; // cannot reason about it, so do not send it
  }

  for (const key of url.searchParams.keys()) {
    if (isSecretName(key)) return true;
  }

  if (SECRET_PATH_RE.test(url.pathname)) return true;

  return url.pathname.split("/").some((seg) => TOKENISH_SEGMENT_RE.test(seg));
}

/** Mask a redacted URL down to something safe to send: origin + path with token-shaped segments
 *  replaced, never the query string. Enough to see "a sign-in callback blew up" without being able
 *  to replay it. */
function describe(raw: string): string {
  try {
    const url = new URL(raw);
    const path = url.pathname
      .split("/")
      .map((seg) => (TOKENISH_SEGMENT_RE.test(seg) ? "<token>" : seg))
      .join("/");
    return `${url.origin}${path}${url.search ? "?<redacted>" : ""}`;
  } catch {
    return "<unparseable url>";
  }
}

/**
 * Remove every bearer secret and personal identifier from a string. Token-bearing URLs collapse to
 * their origin + masked path, credentialed URIs keep their scheme and host but lose the password,
 * JWTs and emails and labelled secrets become placeholders. Ordinary prose, stack frames, and
 * ordinary URLs survive, so the report is still recognisably the crash that happened.
 */
export function redactSecrets(text: string): string {
  let out = text;

  // Credentialed URIs first: `postgres://u:p@host/db` is not matched by URL_RE and its password
  // must go before anything else has a chance to keep it.
  out = out.replace(CREDENTIALED_URI_RE, (_m, scheme: string, _userinfo: string, rest: string) => {
    const host = rest.split(/[/?#]/)[0] ?? "";
    return `${scheme}://${REDACTED_SECRET}@${host}`;
  });

  out = out.replace(URL_RE, (match) => (isSensitiveUrl(match) ? `${REDACTED} ${describe(match)}` : match));

  out = out.replace(JWT_RE, REDACTED_SECRET);
  out = out.replace(HMAC_RE, (_m, alg: string) => `${alg}=${REDACTED_SECRET}`);

  out = out.replace(ENV_SECRET_RE, (_m, name: string, value: string) =>
    value.startsWith("[redacted") ? `${name}=${value}` : `${name}=${REDACTED_SECRET}`
  );

  out = out.replace(SECRET_LABEL_RE, (_m, label: string, value: string) =>
    value.startsWith("[redacted") ? `${label}: ${value}` : `${label}: ${REDACTED_SECRET}`
  );

  // Last, and broadest: any `name=value` whose NAME says secret. Runs after the specific rules so
  // their nicer output (scheme + host, `sha256=[redacted]`) is what survives. Optional matching
  // quotes around the name and value mean this reads a naked query string AND a JSON fragment.
  out = out.replace(
    KEY_VALUE_RE,
    (match, q1: string, name: string, sep: string, q2: string, value: string) => {
      if (!isSecretName(name)) return match;
      if (value.startsWith("[redacted")) return match;
      return `${q1}${name}${q1}${sep}${q2}${REDACTED_SECRET}`;
    }
  );

  out = out.replace(EMAIL_RE, REDACTED_EMAIL);

  return out;
}

/** Recursively scrub an arbitrary attached payload (request body, `extra`, breadcrumb data).
 *
 *  KEY-AWARE on purpose: a bare `cs_live_...` sitting as the value of a `client_secret` field
 *  matches no pattern on its own, because a credential is only recognisable as one from the name
 *  next to it. Depth-limited so a cyclic or pathological object can never wedge the error path. */
function scrubDeep(value: unknown, depth = 0, key?: string): unknown {
  if (depth > 4) return value;
  if (typeof value === "string") {
    // Short values (`GET`, `200`) are not credentials however the field is named.
    if (key && value.length >= 4 && isSecretName(key)) return REDACTED_SECRET;
    return redactSecrets(value);
  }
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1, key));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubDeep(v, depth + 1, k);
    }
    return out;
  }
  return value;
}

/**
 * Sentry `beforeSend`. Strips the account identity, the request cookies and auth headers, and every
 * secret-shaped substring from the message, exception values, request, and breadcrumbs.
 *
 * Never returns null: we still want the crash signal, just with the credentials taken out.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrub = (s: string | undefined): string | undefined => (s ? redactSecrets(s) : s);

  if (event.message) event.message = scrub(event.message);

  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrub(ex.value);
  }

  // Never ship the account identity or the network origin. Email IS the account key here.
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  // Request context: keep a scrubbed URL for triage, drop the credential-bearing parts outright.
  if (event.request) {
    if (typeof event.request.url === "string") event.request.url = redactSecrets(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = redactSecrets(event.request.query_string);
    }
    delete event.request.cookies;

    const headers = event.request.headers as Record<string, string> | undefined;
    if (headers) {
      for (const key of Object.keys(headers)) {
        const k = key.toLowerCase();
        // The three universal ones, plus this repo's own signed-webhook HMAC header.
        if (
          k === "cookie" ||
          k === "authorization" ||
          k === "set-cookie" ||
          k === "x-witus-signature"
        ) {
          delete headers[key];
        }
      }
    }

    if (event.request.data !== undefined) {
      event.request.data = scrubDeep(event.request.data);
    }
  }

  // Breadcrumbs are the quiet leak: the browser SDK records every fetch and navigation, so a
  // magic-link callback URL lands here even when the exception itself is clean.
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = redactSecrets(crumb.message);
    if (crumb.data) crumb.data = scrubDeep(crumb.data) as Record<string, unknown>;
  }

  if (event.extra) event.extra = scrubDeep(event.extra) as Record<string, unknown>;

  return event;
}
