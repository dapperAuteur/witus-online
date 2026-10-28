import "server-only";
import { count as countRows, desc, min } from "drizzle-orm";
import type { Db } from "@/db";
import { claudeUsageResponses, claudeUsageSnapshots } from "@/db/schema";

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

/**
 * What the push wrote to the archive (claude_usage_responses) in the run that made this snapshot.
 * `read` is the number of responses the run merged back from the archive (--with-archive) because
 * their transcripts were gone; the rest are the counts of the archive pass (absent when the run did
 * not push, null when the driver did not report an inserted count).
 */
export interface ArchiveDetail {
  read?: number;
  attempted?: number;
  inserted?: number | null;
  skipped_existing?: number | null;
  skipped_no_timestamp?: number;
  batches?: number;
  batch_size?: number;
  rows?: number;
  earliest?: string | null;
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
  archive?: ArchiveDetail | null;
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

export type ArchiveStatus =
  | { status: "ok"; rows: number; earliest: Date | string | null }
  | { status: "no-table"; message: string };

/**
 * How many responses the archive (claude_usage_responses) holds and its earliest timestamp, live.
 * "no-table" when migration 0008 has not been applied yet, so the page can say so instead of
 * failing (same pattern as latestClaudeUsageSnapshot).
 */
export async function claudeUsageArchiveStatus(db: Db): Promise<ArchiveStatus> {
  try {
    const rows = await db
      .select({ rows: countRows(), earliest: min(claudeUsageResponses.ts) })
      .from(claudeUsageResponses);
    const row = rows[0];
    // min() over a timestamptz column arrives as a Date (drizzle maps it with the column) or, from
    // some driver paths, as the raw string; stamp() takes either.
    const earliest = (row?.earliest ?? null) as Date | string | null;
    return { status: "ok", rows: Number(row?.rows ?? 0), earliest };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/relation .*claude_usage_responses.* does not exist/i.test(message)) {
      return { status: "no-table", message };
    }
    throw e;
  }
}

/**
 * The one command that refreshes this page, run on the machine that holds the transcripts. It
 * archives every response, counts the archived responses whose transcripts are gone, and inserts
 * the snapshot row.
 */
export const PUSH_COMMAND =
  "node /Users/bam/Code_NOiCloud/ai-builds/gemini/witus/scripts/usage-report.mjs --push --with-archive";

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
