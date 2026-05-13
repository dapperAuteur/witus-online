import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Next.js loads `.env.local` automatically at dev/build time, but drizzle-kit
// runs outside the Next runtime and only sees what `dotenv` loads for it.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

// Accept either naming convention the Vercel-Neon integration may use:
//   STORAGE_DATABASE_URL{,_UNPOOLED}  — older marketplace integration
//   DATABASE_URL{,_UNPOOLED}          — newer Neon integration
// Prefer unpooled for DDL (drizzle-kit needs the direct connection, not pgbouncer).
const migrationUrl =
  process.env.STORAGE_DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.STORAGE_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED / STORAGE_DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL / STORAGE_DATABASE_URL is required to run drizzle-kit"
  );
}

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
} satisfies Config;
