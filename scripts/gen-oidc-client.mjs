#!/usr/bin/env node
/**
 * Generate an OAuth client_id + client_secret for one ecosystem app, and print
 * exactly which env vars to set where (operator task 42, step 5).
 *
 *   node scripts/gen-oidc-client.mjs <app-slug>
 *   e.g. node scripts/gen-oidc-client.mjs witus-online
 *
 * Conventions match lib/identity/clients.ts (clientId = `witus-<slug>`, the IdP
 * secret env var = `WITUS_OIDC_SECRET__<SLUG>`). Run once per app, as it converts.
 * The secret is shown ONCE — save it in your password manager.
 */
import crypto from "node:crypto";

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Usage: node scripts/gen-oidc-client.mjs <app-slug>");
  console.error("  slug: lowercase letters, digits, hyphens (e.g. witus-online, flashlearn, learn)");
  process.exit(1);
}

const clientId = `witus-${slug}`;
const clientSecret = crypto.randomBytes(32).toString("base64url");
const secretEnvVar = `WITUS_OIDC_SECRET__${slug.toUpperCase().replace(/-/g, "_")}`;

const out = [
  "",
  `OAuth client for "${slug}"`,
  "─".repeat(48),
  "",
  "1) On the IdP project (witus.online, serving accounts.witus.online)",
  "   Vercel → Settings → Environment Variables (Production + Preview):",
  `     ${secretEnvVar}=${clientSecret}`,
  "",
  `2) On the "${slug}" CLIENT app's Vercel project:`,
  `     WITUS_OIDC_CLIENT_ID=${clientId}`,
  `     WITUS_OIDC_CLIENT_SECRET=${clientSecret}`,
  "",
  "   Discovery URL the client points at:",
  "     https://accounts.witus.online/api/idp/.well-known/openid-configuration",
  "",
  "Save the secret in your password manager — it is shown once.",
  "",
];
console.log(out.join("\n"));
