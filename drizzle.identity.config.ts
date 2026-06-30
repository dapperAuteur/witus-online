import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Separate drizzle-kit config for the IdP's identity database. Run with:
//   npx drizzle-kit generate --config drizzle.identity.config.ts
//   npx drizzle-kit migrate  --config drizzle.identity.config.ts
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

// Prefer the unpooled (direct) connection for DDL; fall back to pooled.
const migrationUrl =
  process.env.IDENTITY_STORAGE_DATABASE_URL_UNPOOLED ??
  process.env.IDENTITY_DATABASE_URL_UNPOOLED ??
  process.env.IDENTITY_STORAGE_DATABASE_URL ??
  process.env.IDENTITY_DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "IDENTITY_STORAGE_DATABASE_URL_UNPOOLED (preferred) or IDENTITY_STORAGE_DATABASE_URL is required to migrate the identity DB"
  );
}

export default {
  schema: "./db/identity-schema.ts",
  out: "./db/identity-migrations",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl },
} satisfies Config;
