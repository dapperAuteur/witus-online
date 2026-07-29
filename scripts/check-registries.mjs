#!/usr/bin/env node
/**
 * Assert that the two ecosystem registries agree with each other.
 *
 *   node scripts/check-registries.mjs
 *
 * Exits 1 on any inconsistency, so it can gate a commit (.githooks/pre-commit) or CI.
 *
 * WHY
 *
 * `lib/products.ts` is the canonical product directory; `lib/identity/clients.ts` is the
 * OIDC client registry. A product declaring `surfaces: ["oidc-client"]` is asserting that
 * a matching client exists — and until now that assertion was only a comment. Nothing
 * could check it, because the two files use DIFFERENT slugs for the same product:
 *
 *     products.ts                 clients.ts
 *     flashlearnai            ->  flashlearn
 *     witus-triage-agent      ->  triage
 *     centenarian-coach       ->  coach
 *     wanderlearn-stories     ->  stories
 *
 * So a product could claim SSO with no registered client, and the first sign would be a
 * real user hitting `invalid_client`. That is exactly the failure mode that took
 * ecosystem sign-in down twice in July 2026 — a registry saying one thing while the
 * runtime believed another. `oidcSlug` makes the link explicit; this script enforces it.
 *
 * Companion to scripts/check-oidc-env.mjs (env vs registry) and
 * scripts/check-posthog-conformance.mjs (analytics config across repos). Same shape:
 * cheap, specific, exits non-zero, explains itself.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Node 22 needs --experimental-strip-types to import the .ts registries; 23.6+ doesn't. */
async function load(path) {
  try {
    return await import(path);
  } catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION" || process.env.__WITUS_REG_RESPAWN) throw err;
    const r = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", fileURLToPath(import.meta.url)],
      { stdio: "inherit", env: { ...process.env, __WITUS_REG_RESPAWN: "1" } },
    );
    process.exit(r.status ?? 1);
  }
}

const products = (await load("../lib/products.ts")).products;
const { ECOSYSTEM_APPS, clientIdFor, redirectUrisFor } = await load("../lib/identity/clients.ts");

const errors = [];
const warnings = [];
const infos = [];

const clientSlugs = new Set(ECOSYSTEM_APPS.map((a) => a.slug));
const claimed = new Map(); // oidcSlug -> [product slugs]

for (const p of products) {
  const isOidc = p.surfaces.includes("oidc-client");

  if (isOidc && !p.oidcSlug) {
    errors.push(
      `product "${p.slug}" declares surfaces:["oidc-client"] but has no oidcSlug.\n` +
        `    Add the matching ECOSYSTEM_APPS slug, or drop "oidc-client" from surfaces\n` +
        `    if this product keeps product-local auth (as stay-witus does).`,
    );
    continue;
  }

  if (!isOidc && p.oidcSlug) {
    errors.push(
      `product "${p.slug}" sets oidcSlug:"${p.oidcSlug}" but does NOT declare\n` +
        `    surfaces:["oidc-client"], so the directory won't treat it as an SSO surface.\n` +
        `    One of the two is wrong.`,
    );
    continue;
  }

  if (!isOidc) continue;

  if (!clientSlugs.has(p.oidcSlug)) {
    errors.push(
      `product "${p.slug}" points at oidcSlug:"${p.oidcSlug}", which is NOT in\n` +
        `    ECOSYSTEM_APPS (lib/identity/clients.ts). buildTrustedClients() would skip it,\n` +
        `    so sign-in for this product fails with invalid_client while the directory\n` +
        `    advertises it as an SSO surface.`,
    );
    continue;
  }

  if (!claimed.has(p.oidcSlug)) claimed.set(p.oidcSlug, []);
  claimed.get(p.oidcSlug).push(p.slug);
}

// Two products sharing one client means they'd share a client secret — the same
// mistake, at the registry level, that check-oidc-env.mjs catches at the env level.
for (const [slug, owners] of claimed) {
  if (owners.length > 1) {
    errors.push(
      `oidcSlug "${slug}" is claimed by ${owners.length} products: ${owners.join(", ")}.\n` +
        `    Distinct products must not share an OAuth client — either could then\n` +
        `    authenticate as the other.`,
    );
  }
}

// A client with no product entry is not necessarily wrong (it may land ahead of the
// directory listing, as `create` did), so this is a warning, not an error.
for (const app of ECOSYSTEM_APPS) {
  if (!claimed.has(app.slug)) {
    warnings.push(
      `ECOSYSTEM_APPS has "${app.slug}" (${clientIdFor(app.slug)}) but no product in\n` +
        `    products.ts points at it. Fine if the client landed ahead of the directory\n` +
        `    entry; otherwise the directory is missing a product.`,
    );
  }
}

// Cross-check the host each registry believes in. Not an error — a product's href is a
// marketing link and may legitimately differ from the app's auth origin — but a mismatch
// is worth seeing, because a wrong origin in clients.ts is exactly what produces a 400.
for (const p of products) {
  if (!p.oidcSlug || !clientSlugs.has(p.oidcSlug)) continue;
  const app = ECOSYSTEM_APPS.find((a) => a.slug === p.oidcSlug);
  try {
    const productHost = new URL(p.href).host;
    const clientHost = new URL(app.origin).host;
    if (productHost !== clientHost) {
      infos.push(
        `"${p.slug}" href host (${productHost}) differs from its OIDC origin (${clientHost}).\n` +
          `    Often fine — href is a marketing link. Confirm the OIDC origin is the host\n` +
          `    the app actually serves from; redirect URIs are matched with strict ===.\n` +
          `    Registered: ${redirectUrisFor(app).join(", ")}`,
      );
    }
  } catch {
    errors.push(`product "${p.slug}" has an unparseable href: ${p.href}`);
  }
}

const rule = "─".repeat(72);
console.log(`\nRegistry cross-check — ${products.length} products, ${ECOSYSTEM_APPS.length} OIDC clients`);
console.log(rule);

for (const e of errors) console.log(`\n✖ ERROR  ${e}`);
for (const w of warnings) console.log(`\n⚠ WARN   ${w}`);
for (const i of infos) console.log(`\nℹ INFO   ${i}`);

console.log(`\n${rule}`);
if (errors.length) {
  console.log(`✖ ${errors.length} error(s), ${warnings.length} warning(s).\n`);
  process.exit(1);
}
console.log(
  `✔ Registries agree. ${claimed.size} product↔client links verified, ` +
    `${warnings.length} warning(s), ${infos.length} note(s).\n`,
);
