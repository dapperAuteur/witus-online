import "server-only";
import { eq, max, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { operatorTasks } from "@/db/schema";

// Reads and writes for /admin/tasks. Rows are written by scripts/sync-user-tasks.mjs on BAM's
// machine; the site only reads them and records "Mark done" / "Undo" (with an audit row each).

export type TaskListRow = {
  key: string;
  app: string;
  appName: string;
  repoPath: string;
  number: string | null;
  numberInt: number | null;
  file: string | null;
  title: string;
  scope: string;
  blocks: string;
  status: string;
  bodyWithheld: string | null;
  hasBody: boolean;
  unindexed: boolean;
  sourceUpdatedAt: Date | null;
  doneAt: Date | null;
  doneBy: string | null;
};

export type TaskListResult =
  | { ok: true; rows: TaskListRow[]; lastSync: Date | null }
  | { ok: false; code: "missing-table" | "error"; message: string };

function isMissingTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /relation .*operator_task.* does not exist/i.test(message);
}

/** Every synced task without its body (bodies load one at a time when a row is opened). */
export async function loadTasks(db: Db): Promise<TaskListResult> {
  try {
    const [rows, [sync]] = await Promise.all([
      db
        .select({
          key: operatorTasks.key,
          app: operatorTasks.app,
          appName: operatorTasks.appName,
          repoPath: operatorTasks.repoPath,
          number: operatorTasks.number,
          numberInt: operatorTasks.numberInt,
          file: operatorTasks.file,
          title: operatorTasks.title,
          scope: operatorTasks.scope,
          blocks: operatorTasks.blocks,
          status: operatorTasks.status,
          bodyWithheld: operatorTasks.bodyWithheld,
          hasBody: sql<boolean>`${operatorTasks.body} is not null`,
          unindexed: operatorTasks.unindexed,
          sourceUpdatedAt: operatorTasks.sourceUpdatedAt,
          doneAt: operatorTasks.doneAt,
          doneBy: operatorTasks.doneBy,
        })
        .from(operatorTasks),
      db.select({ lastSync: max(operatorTasks.syncedAt) }).from(operatorTasks),
    ]);
    return { ok: true, rows, lastSync: sync?.lastSync ?? null };
  } catch (err) {
    if (isMissingTable(err)) {
      return {
        ok: false,
        code: "missing-table",
        message: "The operator_task table is not in this database yet. Apply migration 0009 (docs/01-operations.md, App database migrations).",
      };
    }
    return { ok: false, code: "error", message: `Could not read tasks (${err instanceof Error ? err.name : "unknown error"}).` };
  }
}

/** One task's markdown body and full index cells, or null when there is no such row. */
export async function loadTaskBody(db: Db, key: string) {
  const [row] = await db
    .select({
      body: operatorTasks.body,
      bodyWithheld: operatorTasks.bodyWithheld,
      file: operatorTasks.file,
      repoPath: operatorTasks.repoPath,
      scope: operatorTasks.scope,
      blocks: operatorTasks.blocks,
      status: operatorTasks.status,
    })
    .from(operatorTasks)
    .where(eq(operatorTasks.key, key))
    .limit(1);
  return row ?? null;
}

/**
 * Set or clear the done mark and write the audit row in ONE statement, so a click can never land
 * without its audit row (the Neon HTTP driver has no interactive transactions). Returns false when
 * nothing changed: the row is gone (a sync removed it) or was already in that state.
 */
export async function setTaskDone(db: Db, key: string, actor: string, done: boolean): Promise<boolean> {
  const result = done
    ? await db.execute(sql`
        with t as (
          update operator_task set done_at = now(), done_by = ${actor}
          where key = ${key} and done_at is null
          returning key, app, title
        )
        insert into operator_task_event (task_key, app, title, action, actor)
        select key, app, title, 'done', ${actor} from t
        returning task_key
      `)
    : await db.execute(sql`
        with t as (
          update operator_task set done_at = null, done_by = null
          where key = ${key} and done_at is not null
          returning key, app, title
        )
        insert into operator_task_event (task_key, app, title, action, actor)
        select key, app, title, 'undo', ${actor} from t
        returning task_key
      `);
  return result.rows.length > 0;
}
