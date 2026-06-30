import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { identityDatabaseUrl } from "./env";
import * as schema from "@/db/identity-schema";

type IdentityDb = NeonHttpDatabase<typeof schema>;

let cached: IdentityDb | null = null;

/**
 * The SEPARATE identity database (`IDENTITY_STORAGE_*`), never the app's
 * `STORAGE_*` DB — the ecosystem rule forbids sharing databases. Lazy so that
 * importing the IdP modules at build time doesn't require the URL until a
 * request actually runs.
 */
export function getIdentityDb(): IdentityDb {
  if (cached) return cached;
  cached = drizzle(neon(identityDatabaseUrl()), { schema });
  return cached;
}

export { schema as identitySchema };
