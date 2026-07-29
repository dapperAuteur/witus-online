#!/usr/bin/env node
/**
 * Generate an OAuth client_id + client_secret for one ecosystem app, and print
 * exactly which env vars to set WHERE (operator task 42, step 5).
 *
 *   node scripts/gen-oidc-client.mjs <app-slug>
 *   e.g. node scripts/gen-oidc-client.mjs online
 *
 * Conventions match lib/identity/clients.ts (clientId = `witus-<slug>`, the IdP
 * secret env var = `WITUS_OIDC_SECRET__<SLUG>`). Run once per app, as it converts.
 * The secret is shown ONCE — save it in your password manager.
 *
 * HARDENED 2026-07-28 after a real incident. The previous version accepted ANY
 * slug and printed two env blocks with only a one-line hint about which project
 * each belonged to. What actually happened:
 *
 *   1. It was run for `stay` — an app that is DELIBERATELY not an OIDC client
 *      (product-local Better Auth; see the note in lib/products.ts). The script
 *      had no way to know, so it minted credentials for a client that can never
 *      exist.
 *   2. BOTH printed blocks were pasted into the IdP repo's .env.local, including
 *      block ②, which belongs on the OTHER app's Vercel project. That made
 *      witus.online's own client identify as witus-stay.
 *   3. A value from that run was later hand-renamed to WITUS_OIDC_SECRET__ONLINE,
 *      so witus-online and witus-stay ended up sharing a client secret.
 *
 * So this version refuses unknown slugs, labels each block's destination
 * unmistakably, special-cases the host app (where both blocks genuinely do belong
 * on one project), and prints the registered redirect URIs — a secret without a
 * matching redirect URI produces a 400 that costs an hour to diagnose.
 *
 * Run `node scripts/check-oidc-env.mjs` afterwards to verify what actually landed.
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * The registry is TypeScript and this script is plain .mjs, so importing it needs
 * type stripping — unflagged on Node 23.6+, behind --experimental-strip-types on
 * 22.x. Rather than pin a Node version or add a tsx devDependency for one helper,
 * try the import and re-exec once with the flag if this runtime can't do it. Keeps
 * `node scripts/gen-oidc-client.mjs <slug>` working on either.
 */
async function loadRegistry() {
  try {
    return await import("../lib/identity/clients.ts");
  } catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION" || process.env.__WITUS_GEN_RESPAWN) throw err;
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        fileURLToPath(import.meta.url),
        ...process.argv.slice(2),
      ],
      { stdio: "inherit", env: { ...process.env, __WITUS_GEN_RESPAWN: "1" } },
    );
    process.exit(result.status ?? 1);
  }
}

const { ECOSYSTEM_APPS, clientIdFor, clientSecretEnvVar, redirectUrisFor } = await loadRegistry();

const slug = process.argv[2];
const known = ECOSYSTEM_APPS.map((a) => a.slug);

if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Usage: node scripts/gen-oidc-client.mjs <app-slug>");
  console.error(`  Registered slugs: ${known.join(", ")}`);
  process.exit(1);
}

const app = ECOSYSTEM_APPS.find((a) => a.slug === slug);

// Refuse unknown slugs. A secret for an unregistered slug is worse than useless:
// buildTrustedClients() skips apps with no registry entry, so the client does not
// exist on the IdP and sign-in fails with invalid_client — while the orphan secret
// sits in env looking provisioned. That is exactly how `stay` happened.
if (!app) {
  console.error(`\n✖ "${slug}" is not in ECOSYSTEM_APPS (lib/identity/clients.ts).\n`);
  console.error("  No secret was generated. A secret for an unregistered slug does");
  console.error("  nothing: buildTrustedClients() skips it, so the IdP has no such");
  console.error("  client and sign-in fails with invalid_client.\n");
  console.error("  If this app SHOULD have Sign in with WitUS:");
  console.error("    1. Add an entry to ECOSYSTEM_APPS in lib/identity/clients.ts");
  console.error("       (origin + callbackPath — check which auth library it uses)");
  console.error("    2. Re-run this script\n");
  console.error("  If it should NOT — some apps keep product-local auth on purpose");
  console.error("  (white-label tenants, Shopify storefronts) — then it needs no");
  console.error("  secret at all. Check lib/products.ts for a note on that product.\n");
  console.error(`  Registered slugs: ${known.join(", ")}\n`);
  process.exit(1);
}

const clientId = clientIdFor(slug);
const clientSecret = crypto.randomBytes(32).toString("base64url");
const secretEnvVar = clientSecretEnvVar(slug);
const redirectUris = redirectUrisFor(app);
const rule = "─".repeat(64);

// The host app is BOTH the IdP and a client of itself, so every var below goes on
// this one project and the secret legitimately appears twice under two names.
// Printing the generic two-project layout here is what leads people to "fix" the
// intentional duplication — or to paste it into the wrong repo.
const isHostApp = slug === "online";

const lines = ["", `OAuth client for "${app.name}"  (client_id: ${clientId})`, rule, ""];

if (isHostApp) {
  lines.push(
    "⚠  This is the HOST app — witus.online is both the IdP and a client of",
    "   itself. Unlike every other app, ALL THREE vars below go on the SAME",
    "   Vercel project (this one), and the secret appears twice under two",
    "   names ON PURPOSE. That duplication is required, not a mistake: the",
    "   IdP validates against WITUS_OIDC_SECRET__ONLINE while the client",
    "   presents WITUS_OIDC_CLIENT_SECRET. They must be equal.",
    "",
    "On the witus.online Vercel project (Production + Preview):",
    "",
    `     ${secretEnvVar}=${clientSecret}`,
    `     WITUS_OIDC_CLIENT_ID=${clientId}`,
    `     WITUS_OIDC_CLIENT_SECRET=${clientSecret}`,
    "",
  );
} else {
  lines.push(
    "① IdP project — witus.online, serving accounts.witus.online",
    "   Vercel → Settings → Environment Variables (Production + Preview):",
    "",
    `     ${secretEnvVar}=${clientSecret}`,
    "",
    rule,
    "",
    `② ⚠  THE "${app.name}" APP'S OWN VERCEL PROJECT — *NOT* THE IdP REPO.`,
    "",
    "   These two do NOT belong in witus.online's env. Pasting them there",
    "   makes witus.online's own client authenticate as this app. Set them",
    "   on the other project:",
    "",
    `     WITUS_OIDC_CLIENT_ID=${clientId}`,
    `     WITUS_OIDC_CLIENT_SECRET=${clientSecret}`,
    "",
    "   Discovery URL that app points at:",
    "     https://accounts.witus.online/api/idp/.well-known/openid-configuration",
    "",
  );
}

lines.push(
  rule,
  "",
  "Registered redirect URI(s) — the IdP exact-matches these, so the app must",
  "send one verbatim or authorize returns 400 'Invalid redirect URI':",
  "",
  ...redirectUris.map((u) => `     ${u}`),
  "",
  `   Path comes from callbackPath in lib/identity/clients.ts. If ${app.name} serves`,
  "   from a different host than the one above (a www/apex pair, a custom domain,",
  "   a preview URL), add it to that entry's extraRedirectUris NOW — a mismatch",
  "   here is the single most common cause of a failed rollout.",
  "",
  rule,
  "",
  "Save the secret in your password manager — it is shown once.",
  "Never reuse one app's secret under another app's variable name.",
  "Then verify with: node scripts/check-oidc-env.mjs",
  "",
);

console.log(lines.join("\n"));
