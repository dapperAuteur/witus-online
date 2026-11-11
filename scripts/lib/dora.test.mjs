// Unit tests for the DORA metrics core (lib/ops/dora-core.mjs) behind /admin/dora and the
// failed-deploy alarm. Every timeline is hand-made; no network, no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_MS,
  HOUR_MS,
  alarmCandidates,
  appTimeline,
  commitRange,
  costPerChange,
  creditsByApp,
  deployEvents,
  failureEpisodes,
  isFixOnlyRange,
  isFixSubject,
  isPostDeployWorkflow,
  leadTimes,
  percentile,
  projectSlug,
  spread,
  statusRecords,
  summarize,
  weeklyChanges,
  workflowEvents,
} from "../../lib/ops/dora-core.mjs";

const T0 = Date.parse("2026-11-01T00:00:00Z");
const at = (h) => new Date(T0 + h * HOUR_MS).toISOString();
const NOW = T0 + 10 * DAY_MS;

/** A linear main: c1 <- c2 <- ... with author dates one hour apart starting at hour `start`. */
function linear(names, { start = 0, messages = {} } = {}) {
  return names.map((sha, i) => ({
    sha,
    authoredAt: at(start + i),
    committedAt: at(start + i),
    message: messages[sha] ?? `feat: ${sha}`,
    parents: i === 0 ? [] : [names[i - 1]],
  }));
}
const dep = (sha, ...statuses) => ({ sha, createdAt: statuses[0]?.at ?? at(0), environment: "Production", statuses });
const st = (state, h, description = null) => ({ state, at: at(h), description, url: `https://vercel.example/${state}/${h}` });
const run = (workflow, sha, conclusion, created, completed, event = "push") => ({
  workflow,
  sha,
  event,
  status: completed == null ? "in_progress" : "completed",
  conclusion: completed == null ? null : conclusion,
  createdAt: at(created),
  completedAt: completed == null ? null : at(completed),
  url: `https://github.example/run/${sha}/${created}`,
});

test("percentile interpolates between ranks; spread gives median and p90", () => {
  assert.equal(percentile([], 0.5), null);
  assert.equal(percentile([5], 0.9), 5);
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.9), 91);
  assert.deepEqual(spread([3, 1, 2]), { median: 2, p90: 2.8, n: 3 });
});

test("fix subjects and post-deploy workflow names", () => {
  for (const m of ["fix: x", "fix(ui): y", "Fix typo", "hotfix: z", 'Revert "feat: a"', "  fix!: b"]) assert.equal(isFixSubject(m), true, m);
  for (const m of ["feat: x", "fixup! feat", "fixture data", "docs: fix later", ""]) assert.equal(isFixSubject(m), false, m);
  for (const n of ["Migrate production database", "Migrate Neon database", "Migrate production identity database", "Seed production courses", "Sync library"]) assert.equal(isPostDeployWorkflow(n), true, n);
  for (const n of ["CI", "e2e", "Cleanup Neon preview branches", "Dependabot Updates", "Dependency Graph"]) assert.equal(isPostDeployWorkflow(n), false, n);
});

test("commitRange follows every parent and stops at the base's ancestors", () => {
  // main: a - b - m (merge of b and side s1-s2, where s1 branches from a)
  const g = new Map(
    [
      { sha: "a", parents: [] },
      { sha: "b", parents: ["a"] },
      { sha: "s1", parents: ["a"] },
      { sha: "s2", parents: ["s1"] },
      { sha: "m", parents: ["b", "s2"] },
    ].map((c) => [c.sha, c]),
  );
  assert.deepEqual(new Set(commitRange(g, "m", "b").commits), new Set(["m", "s2", "s1"]));
  assert.equal(commitRange(g, "m", "b").partial, false);
  assert.deepEqual(new Set(commitRange(g, "m", null).commits), new Set(["m", "b", "a", "s1", "s2"]));
  assert.equal(commitRange(g, "zz", "a").known, false);
  // A parent outside the fetched graph marks the range partial.
  const g2 = new Map([["x", { sha: "x", parents: ["older"] }]]);
  assert.equal(commitRange(g2, "x", null).partial, true);
});

test("leadTimes skips merge commits; mergeWait is newest author date to deploy", () => {
  const commits = linear(["a", "b", "c"]);
  commits.push({ sha: "m", authoredAt: at(50), committedAt: at(50), message: "Merge branch", parents: ["c", "b"] });
  const g = new Map(commits.map((c) => [c.sha, c]));
  const lt = leadTimes(g, ["a", "b", "c", "m"], T0 + 5 * HOUR_MS);
  assert.equal(lt.authoringMs, 2 * HOUR_MS);
  assert.equal(lt.mergeWaitMs, 3 * HOUR_MS);
  assert.deepEqual(leadTimes(g, ["m"], T0), { authoringMs: null, mergeWaitMs: null });
  assert.equal(isFixOnlyRange(g, ["m"]), false);
});

test("deployEvents keeps success, failure and error, drops inactive and pending", () => {
  const ev = deployEvents([dep("a", st("pending", 0), st("failure", 1), st("success", 2), st("inactive", 3), st("error", 4))]);
  assert.deepEqual(ev.map((e) => [e.ok, e.at]), [
    [false, T0 + HOUR_MS],
    [true, T0 + 2 * HOUR_MS],
    [false, T0 + 4 * HOUR_MS],
  ]);
});

test("workflowEvents keeps completed post-deploy runs that succeeded or failed", () => {
  const ev = workflowEvents([
    run("Migrate production database", "a", "success", 0, 1),
    run("Seed production courses", "a", "failure", 0, 2),
    run("Seed production courses", "a", "cancelled", 3, 4),
    run("CI", "a", "failure", 0, 1),
    run("Migrate production database", "b", null, 5, null),
  ]);
  assert.deepEqual(ev.map((e) => [e.workflow, e.ok]), [
    ["Migrate production database", true],
    ["Seed production courses", false],
  ]);
});

test("appTimeline: changes are first successes; redeploys are not changes; lead times per range", () => {
  const commits = linear(["c1", "c2", "c3", "c4"]);
  const tl = appTimeline({
    deployments: [dep("c1", st("success", 1)), dep("c3", st("success", 5)), dep("c3", st("success", 9)), dep("c4", st("success", 30))],
    commits,
    runs: [],
    now: NOW,
  });
  assert.deepEqual(tl.changes.map((c) => c.sha), ["c1", "c3", "c4"]);
  // c3's range is c2..c3, authored at hours 1 and 2, deployed at hour 5.
  const c3 = tl.changes[1];
  assert.equal(c3.commits, 2);
  assert.equal(c3.authoringMs, HOUR_MS);
  assert.equal(c3.mergeWaitMs, 3 * HOUR_MS);
  // The first change has no previous deployment, so no range and no lead times.
  assert.equal(tl.changes[0].authoringMs, null);
  assert.equal(tl.attempts.length, 3);
  assert.equal(tl.episodes.length, 0);
});

test("appTimeline: a failed deploy opens an episode that the next successful deploy closes", () => {
  const commits = linear(["c1", "c2", "c3"]);
  const tl = appTimeline({
    deployments: [dep("c1", st("success", 1)), dep("c2", st("failure", 3, "Deployment has failed")), dep("c3", st("success", 6))],
    commits,
    runs: [],
    now: NOW,
  });
  assert.equal(tl.episodes.length, 1);
  assert.equal(tl.episodes[0].sha, "c2");
  assert.equal(tl.episodes[0].kind, "deploy");
  assert.equal(tl.episodes[0].end - tl.episodes[0].start, 3 * HOUR_MS);
  const c2 = tl.attempts.find((a) => a.sha === "c2");
  assert.deepEqual(c2.failedBy, ["deploy"]);
  const s = summarize([tl], NOW, 30);
  assert.equal(s.changes, 2);
  assert.equal(s.attempts, 3);
  assert.equal(s.failed, 1);
  assert.equal(s.changeFailRate, 1 / 3);
  assert.equal(s.recovery.median, 3 * HOUR_MS);
  assert.equal(s.openFailures, 0);
});

test("a redeploy that turns the same deployment green recovers it", () => {
  const tl = appTimeline({
    deployments: [dep("c1", st("failure", 1), st("success", 2))],
    commits: linear(["c1"]),
    runs: [],
    now: NOW,
  });
  assert.equal(tl.changes.length, 1);
  assert.equal(tl.episodes[0].end - tl.episodes[0].start, HOUR_MS);
});

test("a failed migration fails the deployment; recovery waits for the workflow re-run", () => {
  const commits = linear(["c1", "c2"]);
  const deployments = [dep("c1", st("success", 1)), dep("c2", st("success", 3))];
  const runs = [
    run("Migrate production database", "c2", "failure", 2, 4),
    run("Migrate production database", "c2", "success", 7, 8, "workflow_dispatch"),
  ];
  const tl = appTimeline({ deployments, commits, runs, now: NOW });
  assert.equal(tl.episodes.length, 1);
  assert.equal(tl.episodes[0].kind, "workflow:Migrate production database");
  assert.equal(tl.episodes[0].start, T0 + 4 * HOUR_MS);
  assert.equal(tl.episodes[0].end, T0 + 8 * HOUR_MS);
  assert.deepEqual(tl.attempts.find((a) => a.sha === "c2").failedBy, ["workflow:Migrate production database"]);
});

test("a deploy is not green while its post-deploy run is still running", () => {
  const commits = linear(["c1", "c2", "c3"]);
  const deployments = [dep("c1", st("success", 1)), dep("c2", st("failure", 2)), dep("c3", st("success", 4))];
  const runs = [run("Seed production courses", "c3", "success", 3, 6)];
  const [ep] = failureEpisodes(
    deployEvents(deployments),
    workflowEvents(runs),
    runs,
  );
  assert.equal(ep.end, T0 + 6 * HOUR_MS);
  void commits;
});

test("a failed deploy is not recovered by the live commit's workflow going green", () => {
  const deployments = [dep("c1", st("success", 1)), dep("c2", st("failure", 3))];
  const runs = [run("Migrate production database", "c1", "success", 4, 5, "workflow_dispatch")];
  const tl = appTimeline({ deployments, commits: linear(["c1", "c2"]), runs, now: NOW });
  assert.equal(tl.episodes.length, 1);
  assert.equal(tl.episodes[0].end, null);
});

test("fix-only change within 24 hours is rework and fails the change before it", () => {
  const commits = linear(["c1", "c2", "c3", "c4", "c5"], { messages: { c3: "fix: null check", c4: "hotfix(api): retry", c5: "fix: later" } });
  const deployments = [dep("c1", st("success", 0)), dep("c2", st("success", 2)), dep("c4", st("success", 10)), dep("c5", st("success", 60))];
  const tl = appTimeline({ deployments, commits, runs: [], now: NOW });
  const by = Object.fromEntries(tl.changes.map((c) => [c.sha, c]));
  assert.equal(by.c4.rework, true);
  assert.equal(by.c5.rework, false, "more than 24 hours after c4");
  assert.deepEqual(tl.attempts.find((a) => a.sha === "c2").failedBy, ["fixed-within-24h"]);
  const s = summarize([tl], NOW, 30);
  assert.equal(s.rework, 1);
  assert.equal(s.reworkRate, 1 / 4);
  // Not an episode: the failure time is unknown, so no recovery time and no alarm.
  assert.equal(tl.episodes.length, 0);
});

test("summarize windows by time; weeklyChanges buckets oldest first", () => {
  const commits = linear(["c1", "c2", "c3"]);
  const old = T0 - 40 * DAY_MS;
  const tl = {
    changes: [
      { sha: "c1", at: old, authoringMs: null, mergeWaitMs: null, rework: false },
      { sha: "c2", at: NOW - DAY_MS, authoringMs: 10, mergeWaitMs: 20, rework: false },
    ],
    attempts: [
      { sha: "c1", at: old, failedBy: [] },
      { sha: "c2", at: NOW - DAY_MS, failedBy: [] },
    ],
    episodes: [],
  };
  assert.equal(summarize([tl], NOW, 30).changes, 1);
  assert.equal(summarize([tl], NOW, 90).changes, 2);
  assert.equal(summarize([tl], NOW, 30).changeFailRate, 0);
  assert.equal(summarize([{ changes: [], attempts: [], episodes: [] }], NOW, 30).changeFailRate, null);
  const bars = weeklyChanges([tl], NOW, 13);
  assert.equal(bars.length, 13);
  assert.equal(bars[12], 1);
  assert.equal(bars.reduce((a, b) => a + b, 0), 2);
  void commits;
});

test("alarmCandidates lists open episodes older than an hour, once each", () => {
  const apps = [
    { slug: "learn-witus", name: "Learn.WitUS", repo: "o/witus-learn", episodes: [{ start: NOW - 2 * HOUR_MS, end: null, sha: "abc", kind: "workflow:Seed production courses", detail: "Seed failure", url: "u" }] },
    { slug: "fly-witus", name: "Fly.WitUS", repo: "o/fly-witus", episodes: [{ start: NOW - 30 * 60_000, end: null, sha: "def", kind: "deploy", detail: null, url: null }] },
    { slug: "stay-witus", name: "Stay.WitUS", repo: "o/stay-witus", episodes: [{ start: NOW - 5 * HOUR_MS, end: NOW - 4 * HOUR_MS, sha: "ghi", kind: "deploy", detail: null, url: null }] },
  ];
  const c = alarmCandidates(apps, NOW);
  assert.equal(c.length, 1);
  assert.equal(c[0].app, "learn-witus");
  assert.equal(c[0].failedAt, NOW - 2 * HOUR_MS);
});

const APPS = [
  { slug: "witus-online", localPath: "/Users/bam/Code_NOiCloud/ai-builds/gemini/witus" },
  { slug: "learn-witus", localPath: "/Users/bam/Code_NOiCloud/ai-builds/claude/witus-learn" },
  { slug: "centenarianos", localPath: "/Users/bam/Code_NOiCloud/ai-builds/gemini/centenarian-os" },
  { slug: "wanderlust", localPath: "/Users/bam/Code_NOiCloud/ai-builds/gemini/wanderlearn/wanderlearn-app" },
  { slug: "tour-witus", localPath: "/Users/bam/Code_NOiCloud/ai-builds/gemini/tour-manager-os" },
  { slug: "anatomy", localPath: null },
];

test("projectSlug maps project dirs, subfolders, underscores and worktrees", () => {
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-gemini-witus", APPS), "witus-online");
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-gemini-witus-plans", APPS), "witus-online");
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-claude-witus-learn", APPS), "learn-witus");
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-gemini-centenarian-os-plans", APPS), "centenarianos");
  assert.equal(projectSlug("-Users-bam-Code_NOiCloud-ai-builds-gemini-tour-manager-os", APPS), "tour-witus");
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-gemini-wanderlearn", APPS), null, "parent folder of two repos");
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-worktrees-witus-learn-crew07", APPS), "learn-witus");
  assert.equal(projectSlug("-Users-bam-Code-NOiCloud-ai-builds-worktrees-witus-dora", APPS), "witus-online");
  assert.equal(projectSlug("-private-tmp-claude-502-scratchpad", APPS), null);
});

test("creditsByApp splits app, coordination (with helpers) and unmapped; counts unpriced", () => {
  const price = (r) => (r.model === "unknown-model" ? null : r.output / 1e6);
  const row = (project, model, isSub, responses, output) => ({ project, model, isSub, responses, input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output });
  const out = creditsByApp(
    [
      row("-Users-bam-Code-NOiCloud-ai-builds-gemini-witus", "m", false, 10, 2e6),
      row("-Users-bam-Code-NOiCloud-ai-builds-gemini-witus", "m", true, 5, 3e6),
      row("-Users-bam-Code-NOiCloud-ai-builds-claude-witus-learn", "m", true, 4, 1e6),
      row("-Users-bam-Code-NOiCloud-ai-builds-claude-witus-learn", "unknown-model", false, 2, 9e6),
      row("-Users-bam-Code-NOiCloud-ai-builds-gemini-wanderlearn", "m", false, 1, 5e5),
    ],
    price,
    APPS,
    "witus-online",
  );
  assert.equal(out.coordination.credits, 5);
  assert.equal(out.coordination.helperCredits, 3);
  assert.equal(out.coordination.responses, 15);
  assert.deepEqual(out.byApp.get("learn-witus"), { credits: 1, responses: 6, unpriced: 2 });
  assert.equal(out.unmapped.credits, 0.5);
  assert.deepEqual(out.unmapped.projects, ["-Users-bam-Code-NOiCloud-ai-builds-gemini-wanderlearn"]);
});

test("costPerChange: direct and all-in with an even coordination share", () => {
  assert.deepEqual(costPerChange({ appCredits: 10, appChanges: 5, coordinationCredits: 100, allChanges: 50 }), { direct: 2, allIn: 4 });
  assert.deepEqual(costPerChange({ appCredits: 10, appChanges: 0, coordinationCredits: 100, allChanges: 50 }), { direct: null, allIn: null });
});

test("statusRecords walks first parents only and stops using statuses once deployments start", () => {
  const v = (state, h) => ({ state, at: at(h), url: `https://vercel.example/${h}` });
  const commits = [
    { sha: "m", parents: ["c3", "side"], vercel: v("success", 9) },
    { sha: "side", parents: ["c2"], vercel: v("success", 7) },
    { sha: "c3", parents: ["c2"], vercel: v("failure", 5) },
    { sha: "c2", parents: ["c1"], vercel: v("pending", 3) },
    { sha: "c1", parents: [], vercel: v("success", 1) },
  ];
  const all = statusRecords(commits, Infinity);
  assert.deepEqual(all.map((r) => [r.sha, r.statuses[0].state]), [
    ["m", "success"],
    ["c3", "failure"],
    ["c1", "success"],
  ]);
  // A GitHub deployment from hour 6 on: only older statuses are used.
  assert.deepEqual(statusRecords(commits, T0 + 6 * HOUR_MS).map((r) => r.sha), ["c3", "c1"]);
  assert.deepEqual(statusRecords([], Infinity), []);
});
