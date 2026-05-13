import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

type WitusDb = NeonHttpDatabase<typeof schema>;

let cached: WitusDb | null = null;

export function getDb(): WitusDb {
  if (cached) return cached;
  const sql = neon(getEnv().STORAGE_DATABASE_URL);
  cached = drizzle(sql, { schema });
  return cached;
}

export type Db = WitusDb;
