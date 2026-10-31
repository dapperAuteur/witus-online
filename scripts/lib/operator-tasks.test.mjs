// Unit tests for the operator-task queue: index parser, closed-status rule, secret filter,
// "do now" ordering, and the folder collector. No database, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  groupByApp,
  isClosedStatus,
  parseIndexTable,
  scanForSecrets,
  sortTasks,
  splitRow,
  taskPriority,
} from "../../lib/operator-tasks/core.mjs";
import { collectRepo } from "./user-tasks-collect.mjs";

test("splitRow keeps pipes inside inline code and escaped pipes", () => {
  assert.deepEqual(splitRow("| 1 | run `a | b` | x \\| y |"), ["1", "run `a | b`", "x | y"]);
});

test("parseIndexTable reads the standard five columns and the link", () => {
  const md = [
    "# Queue",
    "",
    "| # | Title | Scope | Blocks | Status |",
    "|---|---|---|---|---|",
    "| 07 | [Set the secret](./07-set-secret.md) | `[env]` | **Blocks** the launch | Pending |",
  ].join("\n");
  const [row] = parseIndexTable(md);
  assert.equal(row.number, "07");
  assert.equal(row.numberInt, 7);
  assert.equal(row.title, "Set the secret");
  assert.equal(row.link, "07-set-secret.md");
  assert.equal(row.scope, "`[env]`");
  assert.equal(row.blocks, "**Blocks** the launch");
  assert.equal(row.status, "Pending");
});

test("parseIndexTable matches columns by name (no Scope column, no link)", () => {
  const md = "| # | Title | Blocks | Status |\n|---|---|---|---|\n| 3 | Paystack secret | Payments | open |";
  const [row] = parseIndexTable(md);
  assert.equal(row.title, "Paystack secret");
  assert.equal(row.link, null);
  assert.equal(row.scope, "");
  assert.equal(row.blocks, "Payments");
  assert.equal(row.status, "open");
});

test("parseIndexTable survives blank lines and headerless rows appended after the notes", () => {
  const md = [
    "| # | Title | Scope | Blocks | Status |",
    "|---|---|---|---|---|",
    "| 1 | [A](./01-a.md) | x | y | Pending |",
    "",
    "| 2 | [B](./02-b.md) | x | y | Pending |",
    "",
    "## Notes",
    "1. **06 Keap** blocks the push",
    "| 3 | [C](./03-c.md) | x | y | Pending |",
    "",
    "| Other | table |",
    "|---|---|",
    "| 9 | not a task |",
  ].join("\n");
  assert.deepEqual(
    parseIndexTable(md).map((r) => r.number),
    ["1", "2", "3"],
  );
});

test("isClosedStatus: done words close, open words and 'MERGED, confirm' do not", () => {
  for (const s of ["Done", "**Done 2026-10-29** (merged)", "✅ Done", "done — used X", "Closed", "Superseded by 12", "FOLDED into 70"]) {
    assert.equal(isClosedStatus(s), true, s);
  }
  for (const s of ["Pending", "open", "✅ MERGED — confirm the seed ran", "Merged; hand checks pending", "TODO", ""]) {
    assert.equal(isClosedStatus(s), false, s);
  }
});

// Credential-shaped strings are assembled at runtime so this file never holds one literally.
const fake = (prefix, n, ch = "a") => prefix + ch.repeat(n);

test("scanForSecrets flags obvious credential shapes and reports line numbers only", () => {
  const cases = [
    `postgresql://neondb_owner:${fake("npg_", 12, "Q")}@ep-x.neon.tech/neondb`,
    fake("sk_" + "live_", 24, "Z"),
    fake("sk_", 30, "b"),
    fake("sk-" + "ant-api03-", 40, "c"),
    fake("sb_" + "secret_", 20, "d"),
    `${fake("eyJ", 20)}.${fake("eyJ", 20)}.${fake("", 20, "s")}`,
    fake("gh" + "p_", 36, "e"),
    "-----BEGIN " + "PRIVATE KEY-----",
    `STRIPE_WEBHOOK_SECRET=${fake("whsec", 32, "9")}`,
  ];
  for (const c of cases) {
    const hits = scanForSecrets(`intro\n${c}\n`);
    assert.equal(hits.length > 0, true, c.slice(0, 12));
    assert.equal(hits[0].line, 2);
    assert.equal(JSON.stringify(hits).includes(c), false, "report must not contain the value");
  }
});

test("scanForSecrets ignores placeholders", () => {
  const ok = [
    "postgresql://stub:stub@stub.invalid:5432/stub",
    "postgres://user:password@host/db",
    "postgresql://<user>:<password>@<host>/neondb",
    "DATABASE_URL=postgres://$PGUSER:${PGPASSWORD}@host/db",
    "sk_live_... and sk_test_... go in the dashboard",
    "sb_secret_... (copy it once)",
    "NEXTAUTH_SECRET=build-check-only-not-a-secret",
    "DJANGO_SECRET_KEY=local-build-only-not-a-real-key",
    "TOKEN=$(openssl rand -base64 32)",
  ];
  for (const s of ok) assert.deepEqual(scanForSecrets(s), [], s);
});

test("taskPriority tiers: security, broken, launch, blocking, open, later", () => {
  assert.equal(taskPriority({ title: "Rotate the Gemini API key", status: "open" }).label, "Security");
  assert.equal(taskPriority({ title: "Merge patches", scope: "`[security]`", status: "Pending" }).tier, 0);
  assert.equal(taskPriority({ title: "Merge", blocks: "**Blocks** closing a GHSA-2464 flaw", status: "Pending" }).tier, 0);
  assert.equal(taskPriority({ title: "Redeploy", blocks: "x", status: "Production deploy FAILED" }).label, "Broken");
  assert.equal(taskPriority({ title: "Merge", blocks: "Blocks the May 4 FlashLearnAI launch", status: "Pending" }).label, "Launch or deadline");
  assert.equal(taskPriority({ title: "Merge", blocks: "Inbox card on the roadmap page", status: "Pending" }).label, "Blocking");
  assert.equal(taskPriority({ title: "Merge", blocks: "Nothing downstream", status: "Pending" }).label, "Open");
  assert.equal(taskPriority({ title: "Tidy", blocks: "x y z", status: "Optional cleanup" }).label, "Later");
  // A long Blocks paragraph that merely mentions an outage is not "Broken".
  assert.equal(
    taskPriority({ title: "Repoint the uptime monitor", blocks: "the homepage can return 200 while a full outage goes unnoticed", status: "open" }).label,
    "Blocking",
  );
  // Security wins over "later".
  assert.equal(taskPriority({ title: "Leak check", status: "parked" }).tier, 0);
});

test("sortTasks orders by tier, then number; groupByApp puts the most urgent app first", () => {
  const tasks = [
    { app: "a", appName: "Alpha", title: "Write docs", numberInt: 1, blocks: "", status: "Pending" },
    { app: "a", appName: "Alpha", title: "Merge", numberInt: 9, blocks: "the roadmap card", status: "Pending" },
    { app: "a", appName: "Alpha", title: "Merge", numberInt: 3, blocks: "the roadmap card", status: "Pending" },
    { app: "b", appName: "Beta", title: "URGENT: rotate token", numberInt: 40, blocks: "", status: "Pending" },
  ];
  assert.deepEqual(
    sortTasks(tasks.filter((t) => t.app === "a")).map((t) => t.numberInt),
    [3, 9, 1],
  );
  const groups = groupByApp(tasks);
  assert.deepEqual(
    groups.map((g) => g.app),
    ["b", "a"],
  );
  assert.equal(groups[0].topTier, 0);
});

test("collectRepo: open rows, closed rows, unindexed files, withheld bodies", () => {
  const repo = mkdtempSync(join(tmpdir(), "user-tasks-"));
  try {
    const dir = join(repo, "plans", "user-tasks");
    mkdirSync(join(dir, "completed"), { recursive: true });
    writeFileSync(
      join(dir, "00-descriptions.md"),
      [
        "| # | Title | Scope | Blocks | Status |",
        "|---|---|---|---|---|",
        "| 01 | [Open one](./01-open.md) | `[env]` | the launch | Pending |",
        "| 02 | [Moved](./completed/02-moved.md) | x | y | Done |",
        "| 03 | [Done but not moved](./03-done.md) | x | y | **Done 2026-10-30** |",
        "| 04 | [Deleted](./04-deleted.md) | x | y | open |",
        "| 05 | No link | x | y | Pending |",
        "| 06 | [Elsewhere](../../../other/plans/user-tasks/06-x.md) | x | y | Pending |",
        "| 07 | [Has a secret](./07-secret.md) | x | y | Pending |",
      ].join("\n"),
    );
    writeFileSync(join(dir, "01-open.md"), "# Open one\n\nSteps.\n");
    writeFileSync(join(dir, "completed", "02-moved.md"), "# Moved\n");
    writeFileSync(join(dir, "03-done.md"), "# Done\n");
    writeFileSync(join(dir, "05-no-link.md"), "# No link\n");
    writeFileSync(join(dir, "07-secret.md"), `# Secret\n\nexport KEY=${"sk_" + "live_" + "a1B2".repeat(6)}\n`);
    writeFileSync(join(dir, "08-unindexed.md"), "# Not listed\n\n**Blocks:** the deploy\n");
    writeFileSync(join(dir, "NN-draft.md"), "# Not numbered\n");

    const out = collectRepo(repo, { app: "demo", appName: "Demo" });
    assert.equal(out.skipped, null);
    assert.deepEqual(
      out.tasks.map((t) => t.key),
      ["demo/01-open.md", "demo/05-no-link.md", "demo/07-secret.md", "demo/08-unindexed.md"],
    );
    const open = out.tasks[0];
    assert.equal(open.body, "# Open one\n\nSteps.\n");
    assert.equal(open.unindexed, false);
    const secret = out.tasks[2];
    assert.equal(secret.body, null);
    assert.match(secret.bodyWithheld, /Stripe-style secret key \(sk_\/rk_\), line 3/);
    assert.equal(out.withheld.length, 1);
    assert.equal(JSON.stringify(out).includes("a1B2".repeat(6)), false, "the secret never leaves the file");
    const unindexed = out.tasks[3];
    assert.equal(unindexed.unindexed, true);
    assert.equal(unindexed.title, "Not listed");
    assert.equal(unindexed.blocks, "the deploy");
    assert.deepEqual(out.doneInRoot, ["03-done.md"]);
    assert.deepEqual(out.gone, ["#04 04-deleted.md"]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("collectRepo skips a repo that is missing or has no queue", () => {
  assert.equal(collectRepo("/nonexistent/repo/path", { app: "x", appName: "x" }).skipped, "repo folder not on this machine");
  const repo = mkdtempSync(join(tmpdir(), "user-tasks-"));
  try {
    assert.equal(collectRepo(repo, { app: "x", appName: "x" }).skipped, "no plans/user-tasks/ folder");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
