// Database half of scripts/sync-user-tasks.mjs. Takes any tagged-template `sql` that returns rows
// (the Neon HTTP driver in production; tests pass a node-postgres adapter for a scratch database),
// so the statements are exercised without a production write.

/**
 * Rows BAM marked done on /admin/tasks that the local queue has not caught up with yet.
 * @param {(strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>} sql
 */
export async function readSiteDone(sql) {
  return sql`
    SELECT key, app, app_name, repo_path, file, number, title, done_at, done_by
    FROM operator_task WHERE done_at IS NOT NULL
    ORDER BY app, number_int NULLS LAST, key
  `;
}

/**
 * Replace one app's rows with `tasks`: upsert every task (keeping done_at/done_by), then delete the
 * app's rows whose key is no longer open locally. Returns the deleted rows that had been marked done
 * on the site (those are now reconciled) and the counts.
 * @param {(strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>} sql
 * @param {string} app
 * @param {import("./user-tasks-collect.mjs").TaskRow[]} tasks
 */
export async function replaceAppTasks(sql, app, tasks) {
  const payload = JSON.stringify(
    tasks.map((t) => ({
      key: t.key,
      app: t.app,
      app_name: t.appName,
      repo_path: t.repoPath,
      number: t.number,
      number_int: t.numberInt,
      file: t.file,
      title: t.title,
      scope: t.scope,
      blocks: t.blocks,
      status: t.status,
      body: t.body,
      body_withheld: t.bodyWithheld,
      unindexed: t.unindexed,
      source_updated_at: t.sourceUpdatedAt,
    })),
  );
  if (tasks.length) {
    await sql`
      INSERT INTO operator_task (key, app, app_name, repo_path, number, number_int, file, title, scope,
        blocks, status, body, body_withheld, unindexed, source_updated_at, synced_at)
      SELECT key, app, app_name, repo_path, number, number_int, file, title, scope, blocks, status, body,
        body_withheld, unindexed, source_updated_at, now()
      FROM jsonb_to_recordset(${payload}::jsonb) AS x(
        key text, app text, app_name text, repo_path text, number text, number_int integer, file text,
        title text, scope text, blocks text, status text, body text, body_withheld text,
        unindexed boolean, source_updated_at timestamptz)
      ON CONFLICT (key) DO UPDATE SET
        app = excluded.app, app_name = excluded.app_name, repo_path = excluded.repo_path,
        number = excluded.number, number_int = excluded.number_int, file = excluded.file,
        title = excluded.title, scope = excluded.scope, blocks = excluded.blocks,
        status = excluded.status, body = excluded.body, body_withheld = excluded.body_withheld,
        unindexed = excluded.unindexed, source_updated_at = excluded.source_updated_at,
        synced_at = now()
    `;
  }
  const keys = JSON.stringify(tasks.map((t) => t.key));
  const removed = await sql`
    DELETE FROM operator_task
    WHERE app = ${app}
      AND key NOT IN (SELECT jsonb_array_elements_text(${keys}::jsonb))
    RETURNING key, title, done_at
  `;
  return {
    upserted: tasks.length,
    removed: removed.length,
    reconciled: removed.filter((r) => r.done_at != null),
  };
}
