// preview-cleanup — list, and with --delete remove, every Vercel preview deployment and every Neon
// `preview/*` branch across the account. The admin page /admin/cost-cleanup runs the same code.
//
//   npx tsx scripts/preview-cleanup.ts            # dry run: inventory only
//   npx tsx scripts/preview-cleanup.ts --delete   # delete everything the inventory lists
//
// Credentials: VERCEL_TOKEN (else the Vercel CLI's auth file on this Mac); NEON_PROJECT_KEYS, a JSON
// object {"<project_id>":"<project-scoped key>", …}, one key per project by rule (or, for a single
// project, NEON_PROJECT_ID + NEON_API_KEY, the same pair the per-repo workflow uses). Without Neon
// credentials the Neon half reports "not configured" and is skipped. .env.local is loaded if present.
// Tokens are never printed. Production deployments and non-preview Neon branches are never touched.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cleanup, inventory, parseNeonProjectKeys } from "../lib/cost-cleanup";

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

async function main(): Promise<void> {
  const DELETE = process.argv.includes("--delete");
  const single =
    process.env.NEON_PROJECT_ID && process.env.NEON_API_KEY ? { [process.env.NEON_PROJECT_ID]: process.env.NEON_API_KEY } : undefined;
  const creds = {
    vercelToken: process.env.VERCEL_TOKEN || vercelTokenFromCli(),
    neonProjectKeys: parseNeonProjectKeys(process.env.NEON_PROJECT_KEYS) ?? single,
  };

  const inv = await inventory(creds);
  const byProject = new Map<string, number>();
  for (const d of inv.vercel.deployments) byProject.set(d.projectName, (byProject.get(d.projectName) ?? 0) + 1);
  console.log(`Vercel: ${inv.vercel.configured ? `${inv.vercel.deployments.length} preview deployment(s) in ${byProject.size} project(s)` : "not configured (no VERCEL_TOKEN and no CLI login)"}`);
  for (const [name, n] of [...byProject].sort((a, b) => b[1] - a[1])) console.log(`  ${name.padEnd(44)} ${n}`);
  console.log(`Neon:   ${inv.neon.configured ? `${inv.neon.branches.length} preview branch(es) deletable, ${inv.neon.skipped.length} preview-named branch(es) skipped (default/protected/parent)` : "not configured (set NEON_PROJECT_KEYS, or NEON_PROJECT_ID + NEON_API_KEY for one project)"}`);
  for (const b of inv.neon.branches) console.log(`  ${b.projectName.padEnd(30)} ${b.name}  (${b.createdAt.slice(0, 10)})`);
  for (const e of inv.errors) console.error(`ERROR ${e}`);
  if (!DELETE) {
    console.log("\nDry run. Re-run with --delete to remove all of the above.");
    process.exit(inv.errors.length ? 1 : 0);
    }
  const res = await cleanup(creds, inv, (l) => console.log(l));
  console.log(`\nDeleted: ${res.vercelDeleted} Vercel preview deployment(s), ${res.neonDeleted} Neon preview branch(es). Failures: ${res.failures.length}`);
  for (const f of res.failures) console.error(`  ${f}`);
  process.exit(res.failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
