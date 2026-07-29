#!/usr/bin/env node
/**
 * Assert that lib/sentry-scrub.ts actually removes credentials from a Sentry event.
 *
 *   node scripts/check-sentry-scrub.mjs
 *
 * Exits 1 if any secret survives, so it can gate a release or run in CI.
 *
 * WHY THIS IS A SCRIPT AND NOT A UNIT TEST
 *
 * This repo has no test runner and adding one for a single pure function would be a bigger change
 * than the feature. It does have a house style for exactly this shape of check
 * (scripts/check-oidc-env.mjs, scripts/check-registries.mjs, scripts/check-posthog-conformance.mjs):
 * a dependency-free .mjs that exits non-zero. This follows it.
 *
 * The assertion is deliberately blunt. Rather than checking "did the regex fire", it builds an
 * event with real-shaped credentials in it, scrubs it, serialises the WHOLE thing with
 * JSON.stringify, and fails if any raw secret string appears anywhere in the output. That catches
 * the leak we actually care about: a secret surviving in a field nobody thought to scrub. Field-by-
 * field assertions pass while the same value rides along in breadcrumbs.
 *
 * lib/sentry-scrub.ts imports only a TYPE from @sentry/nextjs, so Node's type stripping can load it
 * with no build step and no SDK installed. This script re-execs itself with the flag when needed,
 * so `node scripts/check-sentry-scrub.mjs` just works.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// Node 22 needs --experimental-strip-types to import a .ts file; 23.6+ does it unflagged. Re-exec
// once with the flag rather than making the caller remember it.
const FLAG = "--experimental-strip-types";
if (!process.execArgv.includes(FLAG) && !process.env.SENTRY_SCRUB_CHECK_REEXEC) {
  const res = spawnSync(
    process.execPath,
    [FLAG, "--no-warnings", fileURLToPath(import.meta.url)],
    { stdio: "inherit", env: { ...process.env, SENTRY_SCRUB_CHECK_REEXEC: "1" } }
  );
  process.exit(res.status ?? 1);
}

const { scrubEvent } = await import(join(HERE, "..", "lib", "sentry-scrub.ts"));

/**
 * Every string here is a value that must NEVER reach the error host. They are fake, but each is the
 * exact SHAPE of a real credential this app handles.
 *
 * KEEP THEM VENDOR-NEUTRAL. An earlier version used `cs_live_...` and `sk_live_...` for the OIDC
 * client secret and the bearer token, and GitHub push protection rejected the whole branch because
 * those are Stripe key prefixes. A fixture only has to have the right SHAPE, so do not borrow a
 * recognisable vendor prefix for one.
 */
const SECRETS = {
  magicLinkToken: "9f2c1ab7de4051c3f8a6b0e2d7c4915a3b8e6f0d2c7a1b9e",
  oidcCode: "ac_7f3d9b1e5a2c8046f1b7d3e9",
  clientSecret: "wo-client-4b81f0d2a6e73c95b0f1a8d4e2c76b39",
  dbPassword: "npg_Qw8ZrT4mLxKp",
  smtpPassword: "smtpPa55word!Long",
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsImVtYWlsIjoiYUBiLmNvbSJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  nextauthSecret: "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MA",
  hmac: "3d5f8a1c9e2b7048d6c1a3f5e9b2074c8a6d1f3e5b9c2074a8d6f1c3e5a9b2074",
  learnerEmail: "learner@example.com",
  cookieValue: "next-auth.session-token=af91c3e0-77d2-4f1a-9b3e-2c4d6e8f0a1b",
  bearer: "Bearer wo-access-2f8a1c9e2b7048d6c1a3f5e9",
  turnstileSecret: "0x4AAAAAAABcDeFgHiJkLmNoPqRsTuVwXyZ",
};

/** An event carrying every one of those, in the places Sentry actually puts them. */
function buildEvent() {
  return {
    message: `sign-in failed for ${SECRETS.learnerEmail} (NEXTAUTH_SECRET=${SECRETS.nextauthSecret})`,
    exception: {
      values: [
        {
          type: "Error",
          value:
            `connect ECONNREFUSED postgres://witus:${SECRETS.dbPassword}@ep-cool-sun.us-east-2.aws.neon.tech/witus ` +
            `while handling https://witus.online/api/auth/callback/email?token=${SECRETS.magicLinkToken}&email=${SECRETS.learnerEmail} ` +
            // Mailgun's SMTP username is itself an email address, so EMAIL_SERVER has TWO `@`.
            // A userinfo pattern that stopped at the first one left this password in the message.
            `and smtp://postmaster@mg.witus.online:${SECRETS.smtpPassword}@smtp.mailgun.org:587 ` +
            `client_secret=${SECRETS.clientSecret} id_token=${SECRETS.jwt}`,
        },
      ],
    },
    user: {
      id: "usr_123",
      email: SECRETS.learnerEmail,
      ip_address: "203.0.113.44",
      username: "learner",
    },
    request: {
      url: `https://accounts.witus.online/api/idp/oauth2/token?code=${SECRETS.oidcCode}`,
      query_string: `code=${SECRETS.oidcCode}&client_secret=${SECRETS.clientSecret}`,
      cookies: { "next-auth.session-token": SECRETS.cookieValue },
      headers: {
        cookie: SECRETS.cookieValue,
        Authorization: SECRETS.bearer,
        "set-cookie": SECRETS.cookieValue,
        "X-Witus-Signature": `sha256=${SECRETS.hmac}`,
        "user-agent": "Mozilla/5.0",
      },
      data: {
        grant_type: "authorization_code",
        client_secret: SECRETS.clientSecret,
        nested: { turnstile: `TURNSTILE_SECRET_KEY=${SECRETS.turnstileSecret}` },
      },
    },
    breadcrumbs: [
      {
        category: "fetch",
        message: `GET https://witus.online/api/auth/callback/email?token=${SECRETS.magicLinkToken}`,
        data: { url: `https://witus.online/api/idp/oauth2/token?code=${SECRETS.oidcCode}` },
      },
    ],
    extra: { rawBody: `{"secret":"${SECRETS.clientSecret}"}` },
  };
}

const failures = [];
function check(label, ok, detail) {
  if (!ok) failures.push(detail ? `${label}\n      ${detail}` : label);
}

// ---------------------------------------------------------------------------
// 1. The blunt one: no raw secret survives ANYWHERE in the serialised event.
// ---------------------------------------------------------------------------
const scrubbed = scrubEvent(buildEvent());
check("scrubEvent must not drop the event (a scrubbed crash is still a crash)", scrubbed != null);

const serialized = JSON.stringify(scrubbed);
for (const [name, value] of Object.entries(SECRETS)) {
  check(
    `secret "${name}" leaked into the serialised event`,
    !serialized.includes(value),
    `found: ${value.slice(0, 24)}...`
  );
}

// ---------------------------------------------------------------------------
// 2. The structural drops Sentry gives us no second chance at.
// ---------------------------------------------------------------------------
check("event.user.email must be deleted", scrubbed.user.email === undefined);
check("event.user.ip_address must be deleted", scrubbed.user.ip_address === undefined);
check("event.user.username must be deleted", scrubbed.user.username === undefined);
check("event.user.id may stay (not PII on its own)", scrubbed.user.id === "usr_123");
check("event.request.cookies must be deleted", scrubbed.request.cookies === undefined);

const h = scrubbed.request.headers;
check("cookie header must be deleted", h.cookie === undefined);
check("authorization header must be deleted", h.Authorization === undefined && h.authorization === undefined);
check("set-cookie header must be deleted", h["set-cookie"] === undefined);
check(
  "X-Witus-Signature header must be deleted (repo-specific webhook HMAC)",
  h["X-Witus-Signature"] === undefined
);
check("benign headers must survive for triage", h["user-agent"] === "Mozilla/5.0");

// ---------------------------------------------------------------------------
// 3. Not so blunt that the report becomes useless. Over-redaction is a real cost.
// ---------------------------------------------------------------------------
const benign = scrubEvent({
  message: "failed to render https://witus.online/explore?state=CA at step 3",
  exception: { values: [{ type: "TypeError", value: "d.map is not a function" }] },
});
check(
  "an ordinary public URL must survive",
  benign.message.includes("https://witus.online/explore?state=CA"),
  `got: ${benign.message}`
);
check(
  "an ordinary exception message must survive",
  benign.exception.values[0].value === "d.map is not a function"
);

// A substring test for secret-ish names flags `design` (contains "sig") and `keyboard" (contains
// "key"). Segment matching must not.
const notSecrets = scrubEvent({ message: "design=modern keyboard=qwerty layout=grid" });
check(
  "field names that merely CONTAIN a secret word must not be redacted",
  notSecrets.message === "design=modern keyboard=qwerty layout=grid",
  `got: ${notSecrets.message}`
);

// The credentialed-URI rule must keep the HOST, or a connection failure loses the one detail that
// makes it triageable.
const dbErr = scrubEvent({
  message: `connect ECONNREFUSED postgres://witus:${SECRETS.dbPassword}@ep-cool-sun.aws.neon.tech/witus`,
});
check(
  "a credentialed URI keeps its scheme and host",
  dbErr.message.includes("postgres://") && dbErr.message.includes("ep-cool-sun.aws.neon.tech"),
  `got: ${dbErr.message}`
);

// An event with none of the optional fields must not throw.
let bare = null;
try {
  bare = scrubEvent({ message: "boom" });
} catch (err) {
  check("scrubEvent must tolerate a minimal event", false, String(err));
}
check("a minimal event survives", bare?.message === "boom");

// ---------------------------------------------------------------------------
if (failures.length) {
  console.error("\nFAIL  lib/sentry-scrub.ts let a credential through:\n");
  for (const f of failures) console.error(`  - ${f}`);
  console.error(`\n${failures.length} failing assertion(s).\n`);
  process.exit(1);
}

console.log("PASS  lib/sentry-scrub.ts: no credential survived the scrub.");
