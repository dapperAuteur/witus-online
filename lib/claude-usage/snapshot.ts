import "server-only";
import { desc } from "drizzle-orm";
import type { Db } from "@/db";
import { claudeUsageSnapshots } from "@/db/schema";

// The latest Claude Code usage snapshot for /admin/usage. Rows are written by
// scripts/usage-report.mjs --push from BAM's machine; this module only reads. The shapes below
// mirror what that script puts in the jsonb `detail` column (see scripts/lib/usage-core.mjs
// detailOf). Every `usd` is API-equivalent list price in US dollars; the page shows it as credits,
// 1 credit = 1 US dollar.

export interface UsageBucket {
  responses: number;
  input: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
  output: number;
  usd: number;
  unpriced: number;
}

export interface LedgerRow {
  id: string;
  date: string;
  repo: string;
  session: string;
  start: string | null;
  end: string | null;
  scope: string;
  description: string;
  reported: string;
  counted: boolean;
  reason?: string;
  found: boolean;
  responses: number;
  tokens: number;
  usd: number;
}

export interface SnapshotDetail {
  credits?: string;
  transcriptRoot?: string;
  files?: number;
  usageLines?: number;
  byMonth?: Record<string, UsageBucket>;
  byModel?: Record<string, UsageBucket>;
  byProject?: Record<string, UsageBucket>;
  unpricedModels?: { model: string; responses: number }[];
  prices?: { source?: string; cached?: string; unit?: string };
  ledger?: {
    file?: string;
    rows?: LedgerRow[];
    counted?: UsageBucket;
    listedNotCounted?: UsageBucket;
    share?: number;
  };
}

export type SnapshotRow = typeof claudeUsageSnapshots.$inferSelect;

export type LatestSnapshot =
  | { status: "ok"; row: SnapshotRow; detail: SnapshotDetail }
  | { status: "empty" }
  | { status: "no-table"; message: string };

/**
 * Newest snapshot, or "empty" when none has been pushed, or "no-table" when migration 0007 has not
 * been applied to this database yet (the page then says what to run instead of failing; the costs
 * page once 500ed for exactly this reason, task 106).
 */
export async function latestClaudeUsageSnapshot(db: Db): Promise<LatestSnapshot> {
  try {
    const rows = await db
      .select()
      .from(claudeUsageSnapshots)
      .orderBy(desc(claudeUsageSnapshots.takenAt))
      .limit(1);
    if (rows.length === 0) return { status: "empty" };
    return { status: "ok", row: rows[0], detail: (rows[0].detail ?? {}) as SnapshotDetail };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/relation .*claude_usage_snapshots.* does not exist/i.test(message)) {
      return { status: "no-table", message };
    }
    throw e;
  }
}

/** The one command that refreshes this page, run on the machine that holds the transcripts. */
export const PUSH_COMMAND =
  "node /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs --push";

export const CREDIT_DEFINITION = "1 credit = 1 US dollar of API list price";

const creditFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Credits from a dollar figure (numeric columns arrive as strings from the driver). */
export function credits(usd: number | string | null | undefined): string {
  const n = usd == null || usd === "" ? 0 : Number(usd);
  return creditFmt.format(Number.isFinite(n) ? n : 0);
}

export const count = (n: number | string | null | undefined): string =>
  Math.round(Number(n ?? 0)).toLocaleString("en-US");

export const percent = (fraction: number): string => `${(100 * fraction).toFixed(2)}%`;

export const tokensOf = (b: UsageBucket): number =>
  b.input + b.cacheWrite5m + b.cacheWrite1h + b.cacheRead + b.output;

/** "YYYY-MM" in UTC, the key the script uses for its by-month table. */
export const monthKey = (d: Date): string => d.toISOString().slice(0, 7);

/** "2026-10-28 04:00 UTC" from a Date or ISO string; empty for null. */
export function stamp(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
