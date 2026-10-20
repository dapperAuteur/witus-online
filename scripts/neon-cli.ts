// Shared helper for scripts that drive the signed-in Neon CLI (`npm i -g neon`, then `neon login`).
import { spawnSync } from "node:child_process";

export function neon<T>(args: string[]): T {
  const r = spawnSync("neon", [...args, "-o", "json"], { encoding: "utf8" });
  if (r.error) {
    console.error("The Neon CLI is not on PATH. Install it with `npm i -g neon`, then `neon login`.");
    process.exit(1);
  }
  if (r.status !== 0) throw new Error(`neon ${args.join(" ")} failed: ${(r.stderr || r.stdout).trim().slice(0, 300)}`);
  return JSON.parse(r.stdout) as T;
}

export const asList = <T>(d: unknown, key: string): T[] =>
  (Array.isArray(d) ? d : ((d as Record<string, T[]>)[key] ?? [])) as T[];

export type Project = { id: string; name: string };
export type Endpoint = { id: string; branch_id: string; type: string; autoscaling_limit_min_cu: number; autoscaling_limit_max_cu: number; current_state?: string };

/** Every project in every organization the signed-in account can see. */
export function allProjects(): (Project & { org: string })[] {
  const orgs = asList<{ id: string; name: string }>(neon(["orgs", "list"]), "organizations");
  return orgs.flatMap((o) => asList<Project>(neon(["projects", "list", "--org-id", o.id]), "projects").map((p) => ({ ...p, org: o.name })));
}
