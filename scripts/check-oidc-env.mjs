#!/usr/bin/env node
/**
 * Audit this project's "Sign in with WitUS" env vars against the client registry.
 *
 *   node scripts/check-oidc-env.mjs            # audits .env.local
 *   node scripts/check-oidc-env.mjs .env.prod  # audits a specific file
 *
 * Exits 1 if any ERROR is found, so it can gate a deploy or a pre-commit hook.
 *
 * WHY THIS EXISTS — every check below is a real failure this repo hit, found
 * 2026-07-28 while debugging a 400 on witus.online's own sign-in:
 *
 *   - WITUS_OIDC_SECRET__ONLINE held a byte-identical copy of the `stay` app's
 *     secret, so two clients shared one credential. Renaming a secret does not
 *     make it a different secret.
 *   - WITUS_OIDC_SECRET__STAY was defined twice with DIFFERENT values. One
 *     silently wins at load; the other is dead weight that reads as configured.
 *   - `stay` is deliberately not an OIDC client at all, so its secret could
 *     never do anything — but it looked provisioned.
 *   - WITUS_OIDC_CLIENT_ID was `witus-stay` in the IdP repo, i.e. block ② of the
 *     generator's output pasted into the wrong project.
 *
 * None of these throw at runtime. They fail as a 400 or a silent no-op weeks
 * later, which is exactly the kind of thing a doctor script should catch.
 *
 * SECRETS ARE NEVER PRINTED. Values are compared and displayed as 8-char
 * SHA-256 fingerprints, which is enough to see "these two are the same" without
 * putting a credential in your scrollback or CI log.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Same type-stripping dance as gen-oidc-client.mjs — see the note there. */
async function loadRegistry() {
  try {
    return await import("../lib/identity/clients.ts");
  } catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION" || process.env.__WITUS_CHECK_RESPAWN) throw err;
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        fileURLToPath(import.meta.url),
        ...process.argv.slice(2),
      ],
      { stdio: "inherit", env: { ...process.env, __WITUS_CHECK_RESPAWN: "1" } },
    );
    process.exit(result.status ?? 1);
  }
}

const { ECOSYSTEM_APPS, clientIdFor, clientSecretEnvVar } = await loadRegistry();

const HOST_SLUG = "online";
const fp = (v) => crypto.createHash("sha256").update(v).digest("hex").slice(0, 8);

const errors = [];
const warnings = [];
const infos = [];

// ── Parse the env file by hand ────────────────────────────────────────────────
// Deliberately NOT process.env: that collapses duplicate keys, and a duplicate
// key with two different values is one of the failures we most need to surface.
const file = process.argv[2] ?? ".env.local";
const filePath = path.resolve(process.cwd(), file);

if (!fs.existsSync(filePath)) {
  console.error(`✖ ${file} not found. Pass a path, or run \`vercel env pull\` first.`);
  process.exit(1);
}

/** @type {Map<string, Array<{line: number, value: string}>>} */
const entries = new Map();
const commentedOidc = [];

fs.readFileSync(filePath, "utf8")
  .split("\n")
  .forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;

    // Track commented-out OIDC vars separately — they're usually leftovers from a
    // half-finished cleanup, and they're worth surfacing without treating as live.
    if (line.startsWith("#")) {
      const m = line.match(/^#+\s*(WITUS_OIDC[A-Z_]*)\s*=/);
      if (m) commentedOidc.push({ line: i + 1, key: m[1] });
      return;
    }

    const eq = line.indexOf("=");
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    if (!key.startsWith("WITUS_OIDC")) return;

    // Strip matched surrounding quotes; a quoted and unquoted copy of the same
    // secret should compare equal, not look like two different values.
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }

    if (!entries.has(key)) entries.set(key, []);
    entries.get(key).push({ line: i + 1, value });
  });

// ── Check 1: duplicate keys ───────────────────────────────────────────────────
for (const [key, occurrences] of entries) {
  if (occurrences.length < 2) continue;
  const distinct = new Set(occurrences.map((o) => o.value));
  const where = occurrences.map((o) => `line ${o.line} (${fp(o.value)})`).join(", ");
  if (distinct.size > 1) {
    errors.push(
      `${key} is defined ${occurrences.length}× with DIFFERENT values — ${where}.\n` +
        `    Only one wins at load and which one is not worth reasoning about.\n` +
        `    Delete all but the correct one.`,
    );
  } else {
    warnings.push(`${key} is defined ${occurrences.length}× with the same value (${where}).`);
  }
}

/** Last occurrence wins, matching how a parsed env object resolves duplicates. */
const env = new Map([...entries].map(([k, occ]) => [k, occ[occ.length - 1].value]));

// ── Check 2: one secret used under two names ─────────────────────────────────
// The headline failure. Two clients sharing a credential means either can
// authenticate as the other, and no error is ever raised.
const byFingerprint = new Map();
for (const [key, value] of env) {
  if (!value) continue;
  if (!byFingerprint.has(value)) byFingerprint.set(value, []);
  byFingerprint.get(value).push(key);
}

for (const [value, keys] of byFingerprint) {
  if (keys.length < 2) continue;

  // The host app is both IdP and client, so CLIENT_SECRET and SECRET__ONLINE
  // are REQUIRED to match. Every other pairing is a reused credential.
  const hostPair = new Set(["WITUS_OIDC_CLIENT_SECRET", clientSecretEnvVar(HOST_SLUG)]);
  const isLegitHostPair = keys.length === 2 && keys.every((k) => hostPair.has(k));

  if (isLegitHostPair) {
    infos.push(
      `${keys.join(" = ")} (${fp(value)}) — correct. The host app is its own` +
        ` client, so these two must be equal.`,
    );
  } else {
    errors.push(
      `Same secret (${fp(value)}) is set under ${keys.length} names: ${keys.join(", ")}.\n` +
        `    Distinct clients must never share a credential — either can then\n` +
        `    authenticate as the other. Rotate: renaming does not separate them.`,
    );
  }
}

// ── Check 3: orphan secrets ──────────────────────────────────────────────────
// Built from the registry rather than by un-mangling the var name, because
// clientSecretEnvVar maps `-` to `_` and that is not reversible.
const secretVarToSlug = new Map(ECOSYSTEM_APPS.map((a) => [clientSecretEnvVar(a.slug), a.slug]));

for (const key of env.keys()) {
  if (!key.startsWith("WITUS_OIDC_SECRET__")) continue;
  if (secretVarToSlug.has(key)) continue;
  errors.push(
    `${key} has no matching entry in ECOSYSTEM_APPS (lib/identity/clients.ts).\n` +
      `    buildTrustedClients() skips unregistered apps, so this secret does\n` +
      `    nothing — sign-in for it fails with invalid_client while the var\n` +
      `    reads as provisioned. Either register the app or delete this var.`,
  );
}

// ── Check 4: this repo's own client identity ─────────────────────────────────
const clientId = env.get("WITUS_OIDC_CLIENT_ID");
const expectedClientId = clientIdFor(HOST_SLUG);

if (!clientId) {
  infos.push(`WITUS_OIDC_CLIENT_ID is unset — the Sign in with WitUS provider stays off.`);
} else if (clientId !== expectedClientId) {
  errors.push(
    `WITUS_OIDC_CLIENT_ID is "${clientId}", expected "${expectedClientId}".\n` +
      `    This is the IdP repo, so its own client is the host app. Another\n` +
      `    app's value here means block ② of gen-oidc-client's output was\n` +
      `    pasted into the wrong project — witus.online would authenticate\n` +
      `    as "${clientId}".`,
  );
}

// ── Check 5: host app can sign into itself ───────────────────────────────────
const clientSecret = env.get("WITUS_OIDC_CLIENT_SECRET");
const hostSecret = env.get(clientSecretEnvVar(HOST_SLUG));

if (clientSecret && hostSecret && clientSecret !== hostSecret) {
  errors.push(
    `WITUS_OIDC_CLIENT_SECRET (${fp(clientSecret)}) != ` +
      `${clientSecretEnvVar(HOST_SLUG)} (${fp(hostSecret)}).\n` +
      `    The host app presents the first and the IdP validates against the\n` +
      `    second, so sign-in fails with invalid_client until they match.`,
  );
} else if (clientId === expectedClientId && clientSecret && !hostSecret) {
  errors.push(
    `WITUS_OIDC_CLIENT_ID is set to the host app but ${clientSecretEnvVar(HOST_SLUG)}\n` +
      `    is missing, so the IdP has no such client registered. Run:\n` +
      `      node scripts/gen-oidc-client.mjs ${HOST_SLUG}`,
  );
}

// ── Check 6: rollout coverage (informational by design) ──────────────────────
// Apps come online one at a time as their secret is provisioned; a missing
// secret is a normal mid-rollout state, not a fault.
const missing = ECOSYSTEM_APPS.filter((a) => !env.get(clientSecretEnvVar(a.slug))).map(
  (a) => a.slug,
);
if (missing.length) {
  infos.push(
    `${ECOSYSTEM_APPS.length - missing.length}/${ECOSYSTEM_APPS.length} registered apps have a secret here.\n` +
      `    Not yet provisioned: ${missing.join(", ")}`,
  );
}

for (const c of commentedOidc) {
  warnings.push(`${c.key} is commented out at line ${c.line} — leftover? Delete it if so.`);
}

// ── Report ───────────────────────────────────────────────────────────────────
const rule = "─".repeat(64);
console.log(`\nOIDC env audit — ${file}`);
console.log(rule);

for (const e of errors) console.log(`\n✖ ERROR  ${e}`);
for (const w of warnings) console.log(`\n⚠ WARN   ${w}`);
for (const i of infos) console.log(`\nℹ INFO   ${i}`);

console.log(`\n${rule}`);
if (errors.length) {
  console.log(`✖ ${errors.length} error(s), ${warnings.length} warning(s).\n`);
  process.exit(1);
}
console.log(`✔ No errors. ${warnings.length} warning(s), ${infos.length} note(s).\n`);
