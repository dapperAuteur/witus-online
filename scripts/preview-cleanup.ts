// preview-cleanup — list, and with --delete remove, every Vercel preview deployment and every Neon
// `preview/*` branch across the account. The admin page /admin/cost-cleanup runs the same code.
//
//   npx tsx scripts/preview-cleanup.ts            # dry run: inventory only
//   npx tsx scripts/preview-cleanup.ts --delete   # delete everything the inventory lists
//
// Credentials: VERCEL_TOKEN (else the Vercel CLI's auth file on this Mac); NEON_PROJECT_KEYS, a JSON
// object {"<project_id>":"<project-scoped key>", …}, one key per project by rule (or, for a single
// project, NEON_PROJECT_ID + NEON_API_KEY, the same pair the per-repo workflow uses). Without Neon
// credentials the script falls back to the Neon CLI signed in on this Mac (`neon login`), so the
// one-time cleanup needs no key on disk: since 2026-10-22 the keys live only in GitHub secrets and the
// witus-online Vercel env, put there unseen by neon-key-plan --store. Same preview/ filter either way.
// .env.local is loaded if present.
//
// Nothing here touches GitHub: it deletes Vercel preview DEPLOYMENTS and Neon `preview/*` DATABASE
// branches. Git branches are never listed or deleted.
// Tokens are never printed. Production deployments and non-preview Neon branches are never touched.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cleanup, inventory, parseNeonProjectKeys, type Inventory } from "../lib/cost-cleanup";
import { isDeletablePreviewBranch, PREVIEW_PREFIX, type NeonBranch } from "../lib/cost-cleanup/neon";
import { allowRateLimitWait } from "../lib/cost-cleanup/vercel";
import { allProjects, asList, neon as neonCli } from "./neon-cli";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local */
}

function vercelTokenFromCli(): string | undefined {
  const p = join(homedir(), "Library/Application Support/com.vercel.cli/auth.json");
  if (!existsSync(p)) return undefined;
  try {
    return (JSON.parse(readFileSync(p, "utf8")) as { token?: string }).token;
  } catch {
    return undefined;
  }
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function neonCliReady(): boolean {
  return spawnSync("neon", ["--version"], { encoding: "utf8" }).status === 0;
}

/** Neon half through the CLI: every project the signed-in account sees, the same deletable rule. */
function neonInventoryFromCli(inv: Inventory): void {
  inv.neon.configured = true;
  for (const p of allProjects()) {
    try {
      type Row = { id: string; name: string; created_at: string; default?: boolean; protected?: boolean; parent_id?: string };
      const all: NeonBranch[] = asList<Row>(neonCli(["branches", "list", "--project-id", p.id]), "branches").map((b) => ({
        id: b.id,
        name: b.name,
        projectId: p.id,
        projectName: p.name,
        createdAt: b.created_at,
        default: Boolean(b.default),
        protected: Boolean(b.protected),
        parentId: b.parent_id,
      }));
      for (const b of all) {
        if (isDeletablePreviewBranch(b, all)) inv.neon.branches.push(b);
        else if (b.name.startsWith(PREVIEW_PREFIX)) inv.neon.skipped.push(b);
      }
    } catch (e) {
      inv.errors.push(`neon project ${p.name}: ${message(e)}`);
    }
  }
}

async function main(): Promise<void> {
  allowRateLimitWait(20 * 60_000); // a terminal can wait out Vercel's delete window; the admin page cannot
  const DELETE = process.argv.includes("--delete");
  const single =
    process.env.NEON_PROJECT_ID && process.env.NEON_API_KEY ? { [process.env.NEON_PROJECT_ID]: process.env.NEON_API_KEY } : undefined;
  const creds = {
    vercelToken: process.env.VERCEL_TOKEN || vercelTokenFromCli(),
    neonProjectKeys: parseNeonProjectKeys(process.env.NEON_PROJECT_KEYS) ?? single,
  };

  const inv = await inventory(creds);
  const viaCli = !creds.neonProjectKeys && neonCliReady();
  if (viaCli) neonInventoryFromCli(inv);
  const byProject = new Map<string, number>();
  for (const d of inv.vercel.deployments) byProject.set(d.projectName, (byProject.get(d.projectName) ?? 0) + 1);
  console.log(`Vercel: ${inv.vercel.configured ? `${inv.vercel.deployments.length} preview deployment(s) in ${byProject.size} project(s)` : "not configured (no VERCEL_TOKEN and no CLI login)"}`);
  for (const [name, n] of [...byProject].sort((a, b) => b[1] - a[1])) console.log(`  ${name.padEnd(44)} ${n}`);
  console.log(`Neon:   ${inv.neon.configured ? `${inv.neon.branches.length} preview branch(es) deletable, ${inv.neon.skipped.length} preview-named branch(es) skipped (default/protected/parent)${viaCli ? " [via the Neon CLI]" : ""}` : "not configured (no NEON_PROJECT_KEYS and no Neon CLI; run `neon login`)"}`);
  for (const b of inv.neon.branches) console.log(`  ${b.projectName.padEnd(30)} ${b.name}  (${b.createdAt.slice(0, 10)})`);
  for (const e of inv.errors) console.error(`ERROR ${e}`);
  if (!DELETE) {
    console.log("\nDry run. Re-run with --delete to remove all of the above.");
    process.exit(inv.errors.length ? 1 : 0);
    }
  // CLI path: Neon first, as cleanup() does with keys, then cleanup() deletes the Vercel half (it skips
  // Neon itself when there are no keys).
  const cliFailures: string[] = [];
  let cliDeleted = 0;
  if (viaCli) {
    for (const b of inv.neon.branches) {
      try {
        neonCli(["branches", "delete", b.id, "--project-id", b.projectId]);
        cliDeleted++;
        console.log(`neon   deleted ${b.projectName} / ${b.name}`);
      } catch (e) {
        cliFailures.push(`neon ${b.projectName}/${b.name}: ${message(e)}`);
      }
    }
  }
  const res = await cleanup(creds, inv, (l) => console.log(l));
  res.neonDeleted += cliDeleted;
  res.failures.unshift(...cliFailures);
  console.log(`\nDeleted: ${res.vercelDeleted} Vercel preview deployment(s), ${res.neonDeleted} Neon preview branch(es). Failures: ${res.failures.length}`);
  for (const f of res.failures) console.error(`  ${f}`);
  process.exit(res.failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
