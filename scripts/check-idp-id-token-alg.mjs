#!/usr/bin/env node
/**
 * Check that the ID-token algorithm NextAuth expects matches the keys accounts.witus.online publishes.
 *
 *   node scripts/check-idp-id-token-alg.mjs                 # checks the live IdP
 *   node scripts/check-idp-id-token-alg.mjs <discovery-url> # checks another IdP (e.g. a preview)
 *
 * Exits 1 on a mismatch, so it can gate a deploy.
 *
 * WHY THIS EXISTS: on 2026-10-16 "Sign in with WitUS" on witus.online failed for every user with
 * ?error=OAuthCallback. The IdP signs ID tokens with EdDSA (its JWKS holds one Ed25519 key);
 * NextAuth v4's openid-client defaults to RS256 and threw "unexpected JWT alg received, expected
 * RS256, got: EdDSA". Discovery advertises RS256 too, so reading discovery alone looks fine. Only
 * the JWKS tells the truth, which is why this script reads the keys, not the advertised list.
 *
 * Needs network access. Prints no secrets: JWKS and discovery are public documents.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

async function loadExpectedAlg() {
  try {
    return (await import("../lib/identity/id-token-alg.ts")).WITUS_ID_TOKEN_ALG;
  } catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION" || process.env.__WITUS_CHECK_RESPAWN) throw err;
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
      { stdio: "inherit", env: { ...process.env, __WITUS_CHECK_RESPAWN: "1" } },
    );
    process.exit(result.status ?? 1);
  }
}

const expected = await loadExpectedAlg();
const discoveryUrl =
  process.argv[2] ?? "https://accounts.witus.online/api/idp/.well-known/openid-configuration";

const discovery = await (await fetch(discoveryUrl)).json();
if (!discovery.jwks_uri) {
  console.error(`ERROR: ${discoveryUrl} has no jwks_uri`);
  process.exit(1);
}
const { keys = [] } = await (await fetch(discovery.jwks_uri)).json();

// A key without an explicit alg is usable for the algorithm its type implies.
const algFor = (k) => k.alg ?? (k.kty === "OKP" ? "EdDSA" : k.kty === "RSA" ? "RS256" : k.kty === "EC" ? `ES?(${k.crv})` : k.kty);
const published = [...new Set(keys.map(algFor))];

console.log(`discovery:          ${discoveryUrl}`);
console.log(`advertised algs:    ${(discovery.id_token_signing_alg_values_supported ?? []).join(", ") || "(none)"}`);
console.log(`JWKS key algs:      ${published.join(", ") || "(no keys)"}`);
console.log(`NextAuth expects:   ${expected}  (lib/identity/id-token-alg.ts)`);

if (!published.includes(expected)) {
  console.error(
    `\nERROR: the IdP publishes no ${expected} key, so every NextAuth "Sign in with WitUS" will fail with ` +
      `?error=OAuthCallback. Set WITUS_ID_TOKEN_ALG to one of: ${published.join(", ")}.`,
  );
  process.exit(1);
}
if (published.length > 1) {
  console.warn(`\nWARN: the JWKS holds keys for several algorithms (${published.join(", ")}); confirm which one signs ID tokens.`);
}
console.log("\nOK");
