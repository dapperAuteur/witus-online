import "server-only";

/**
 * Env for the WitUS Accounts IdP. Kept SEPARATE from `lib/env.ts` so the live
 * witus.online app (which doesn't need these) never fails validation when they're
 * unset. Read lazily — only the IdP routes touch these.
 *
 *   IDENTITY_STORAGE_DATABASE_URL  — the dedicated identity Neon DB (pooled, runtime)
 *   BETTER_AUTH_SECRET             — signing/encryption secret for the IdP
 *   BETTER_AUTH_URL                — public IdP origin, e.g. https://accounts.witus.online
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[witus-accounts] missing env ${name} — required for the WitUS Accounts IdP`
    );
  }
  return value;
}

/** Pooled identity DB URL (runtime queries). Accepts the Neon integration aliases. */
export function identityDatabaseUrl(): string {
  return required(
    "IDENTITY_STORAGE_DATABASE_URL",
    process.env.IDENTITY_STORAGE_DATABASE_URL ?? process.env.IDENTITY_DATABASE_URL
  );
}

export function betterAuthSecret(): string {
  return required("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET);
}

/** Public IdP origin. Falls back to the production host. */
export function betterAuthUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "https://accounts.witus.online";
}
