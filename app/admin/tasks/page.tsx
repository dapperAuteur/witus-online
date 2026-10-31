import { getDb } from "@/db";
import { loadTasks } from "@/lib/operator-tasks/queries";
import { Notice, TasksView } from "./tasks-view";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const result = await loadTasks(getDb());
  if (!result.ok) {
    return (
      <Notice tone={result.code === "missing-table" ? "amber" : "red"}>
        <p role={result.code === "missing-table" ? undefined : "alert"}>{result.message}</p>
      </Notice>
    );
  }

  if (result.rows.length === 0) {
    return (
      <Notice tone="amber">
        <p>
          Nothing synced yet. From the witus repo root on the laptop, run{" "}
          <span className="font-mono">node scripts/sync-user-tasks.mjs</span>.
        </p>
      </Notice>
    );
  }

  return <TasksView rows={result.rows} lastSync={result.lastSync} />;
}
