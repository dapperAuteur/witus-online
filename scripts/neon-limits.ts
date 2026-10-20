// neon-limits — cap every Neon compute's autoscaling range so no database can run large on the Launch plan.
//
//   npx tsx scripts/neon-limits.ts                                   # dry run: endpoints outside the range
//   npx tsx scripts/neon-limits.ts --apply --save plans/user-tasks/<file>.tsv
//   npx tsx scripts/neon-limits.ts --min 0.25 --max 2 --only witus-learn-db
//
// Why (2026-10-20): moving the Vercel-managed organization to Launch raised every compute's maximum to
// 8 CU (four projects sit at 1 to 9 CU), and on Launch every awake hour bills at $0.106 per CU-hour, so a
// burst at 8 CU costs 32 times the 0.25 CU floor. Learn.WitUS ran on 0.25 to 2 CU before the upgrade.
// Compute size, not a budget, is Neon's cost limiter here; Vercel's Spend Management does not cover
// Marketplace integrations (Vercel docs, spend-management, read 2026-10-20).
// --save writes every endpoint's previous range first, so the change can be undone by hand or with
// --min/--max per project. Uses the signed-in Neon CLI; prints no secrets.

import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { allProjects, asList, neon, type Endpoint } from "./neon-cli";

const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const APPLY = process.argv.includes("--apply");
const MIN = Number(arg("--min") ?? 0.25);
const MAX = Number(arg("--max") ?? 2);
const ONLY = arg("--only")?.split(",");
const SAVE = arg("--save");

const rows = ["project\tproject_id\tendpoint_id\tbranch_id\tmin_cu\tmax_cu"];
let outside = 0;
let changed = 0;
for (const p of allProjects().filter((x) => !ONLY || ONLY.includes(x.name))) {
  for (const e of asList<Endpoint>(neon(["api", `/projects/${p.id}/endpoints`]), "endpoints")) {
    rows.push([p.name, p.id, e.id, e.branch_id, e.autoscaling_limit_min_cu, e.autoscaling_limit_max_cu].join("\t"));
    if (e.autoscaling_limit_min_cu === MIN && e.autoscaling_limit_max_cu === MAX) continue;
    outside++;
    const was = `${e.autoscaling_limit_min_cu}-${e.autoscaling_limit_max_cu} CU`;
    if (!APPLY) {
      console.log(`${p.name.padEnd(34)} ${e.id}  ${was} → ${MIN}-${MAX} CU`);
      continue;
    }
    const r = spawnSync("neon", ["api", "-X", "PATCH", `/projects/${p.id}/endpoints/${e.id}`, "-d", JSON.stringify({ endpoint: { autoscaling_limit_min_cu: MIN, autoscaling_limit_max_cu: MAX } }), "-o", "json"], { encoding: "utf8" });
    const ok = r.status === 0;
    if (ok) changed++;
    console.log(`${p.name.padEnd(34)} ${e.id}  ${was} → ${ok ? `${MIN}-${MAX} CU` : `FAILED: ${(r.stderr || r.stdout).trim().slice(0, 160)}`}`);
  }
}
if (SAVE) writeFileSync(SAVE, rows.join("\n") + "\n");
console.log(APPLY ? `\nChanged ${changed} of ${outside} endpoint(s).` : `\n${outside} endpoint(s) outside ${MIN}-${MAX} CU. Re-run with --apply --save <file.tsv>.`);
