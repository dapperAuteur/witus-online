// DORA metrics for /admin/dora, as pure functions over data the fetcher already normalized
// (lib/ops/dora.ts reads GitHub and the usage archive). No imports and no I/O, so `npm test`
// (scripts/lib/dora.test.mjs) runs it on hand-made timelines. Definitions, and every place the
// data forced a refinement of the approved design, are in docs/02-dora-metrics.md; the comments
// here name the rule each function implements.
//
// Input shapes (all times ISO strings, all states lowercase):
//   Deployment  { sha, createdAt, environment, statuses: [{ state, at, description, url }] }
//   CommitNode  { sha, authoredAt, committedAt, message, parents: [sha] }
//   Run         { workflow, sha, event, status, conclusion, createdAt, completedAt, url }

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

/** A deployment within this long of the previous change, made only of fix commits, is rework. */
export const REWORK_WINDOW_MS = DAY_MS;

/** An open failure older than this sends the alarm email. */
export const ALARM_AFTER_MS = 60 * 60_000;

/** The windows the page shows. */
export const WINDOWS = /** @type {const} */ ([30, 90]);

/** Workflow names that are post-deploy steps: migrations, seeds and syncs (shared rules v9). */
export const POST_DEPLOY_WORKFLOW = /\b(migrat\w*|seed\w*|sync\w*)\b/i;

/** Commit subjects that count as a fix for the rework rule. "fixup!" and "fixture" do not match. */
export const FIX_SUBJECT = /^(fix|hotfix|revert)\b/i;

/** Workflow conclusions that are failures. cancelled, skipped and neutral are not. */
const FAILED_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure"]);

const ms = (iso) => {
  const t = Date.parse(iso ?? "");
  return Number.isNaN(t) ? null : t;
};

/** True when a workflow name is a post-deploy step (Migrate production database, Seed ..., Sync ...). */
export function isPostDeployWorkflow(name) {
  return POST_DEPLOY_WORKFLOW.test(name ?? "");
}

/** True when a commit subject starts with fix, hotfix or revert (any case). */
export function isFixSubject(message) {
  return FIX_SUBJECT.test((message ?? "").trimStart());
}

/**
 * Value at fraction p (0..1) of a list, by linear interpolation between closest ranks (the
 * spreadsheet PERCENTILE.INC rule). Null for an empty list.
 * @param {number[]} values
 * @param {number} p
 */
export function percentile(values, p) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** { median, p90, n } of a list (nulls for an empty list). */
export function spread(values) {
  return { median: percentile(values, 0.5), p90: percentile(values, 0.9), n: values.length };
}

// ---- commit ranges ------------------------------------------------------------------------------

/**
 * Commits a deployment of `head` brought that the deployment of `base` did not have: everything
 * reachable from head (following every parent, so the commits of a --no-ff bundle merge count)
 * minus everything reachable from base. `partial` is true when the walk left the fetched graph
 * (a parent older than the history read), so the range may be missing old commits.
 * @param {Map<string, { sha: string, parents: string[] }>} graph
 * @param {string} head
 * @param {string | null} base
 * @returns {{ commits: string[], partial: boolean, known: boolean }}
 */
export function commitRange(graph, head, base) {
  if (!graph.has(head)) return { commits: [], partial: true, known: false };
  const reach = (start) => {
    const seen = new Set();
    let left = false;
    const stack = start ? [start] : [];
    while (stack.length) {
      const sha = stack.pop();
      if (seen.has(sha)) continue;
      const node = graph.get(sha);
      if (!node) {
        left = true;
        continue;
      }
      seen.add(sha);
      for (const p of node.parents) stack.push(p);
    }
    return { seen, left };
  };
  const excluded = base ? reach(base).seen : new Set();
  const out = [];
  let partial = false;
  const seen = new Set();
  const stack = [head];
  while (stack.length) {
    const sha = stack.pop();
    if (seen.has(sha) || excluded.has(sha)) continue;
    seen.add(sha);
    const node = graph.get(sha);
    if (!node) {
      partial = true;
      continue;
    }
    out.push(sha);
    for (const p of node.parents) stack.push(p);
  }
  if (base && !graph.has(base)) partial = true;
  return { commits: out, partial, known: true };
}

/**
 * Lead times for one change. authoring: oldest to newest author date in the range; mergeWait:
 * newest author date to the deployment's success. Merge commits (two parents) are skipped: they
 * are the bundle's plumbing, not authored work. Null when the range is unknown or empty.
 * @param {Map<string, any>} graph
 * @param {string[]} shas
 * @param {number} deployedAt
 */
export function leadTimes(graph, shas, deployedAt) {
  const dates = [];
  for (const sha of shas) {
    const c = graph.get(sha);
    if (!c || c.parents.length > 1) continue;
    const t = ms(c.authoredAt);
    if (t != null) dates.push(t);
  }
  if (dates.length === 0) return { authoringMs: null, mergeWaitMs: null };
  const oldest = Math.min(...dates);
  const newest = Math.max(...dates);
  return { authoringMs: newest - oldest, mergeWaitMs: Math.max(0, deployedAt - newest) };
}

/** True when the range has at least one non-merge commit and every non-merge subject is a fix. */
export function isFixOnlyRange(graph, shas) {
  let any = false;
  for (const sha of shas) {
    const c = graph.get(sha);
    if (!c || c.parents.length > 1) continue;
    if (!isFixSubject(c.message)) return false;
    any = true;
  }
  return any;
}

// ---- one app's timeline -------------------------------------------------------------------------

/**
 * Production deployment events, oldest first. Every success, failure or error status is an event
 * (Vercel reuses one GitHub deployment for a redeploy of the same commit, so one deployment can go
 * failure, then success, then failure again). inactive, pending, queued and in_progress are not.
 * @param {any[]} deployments
 */
export function deployEvents(deployments) {
  const out = [];
  for (const d of deployments) {
    for (const s of d.statuses ?? []) {
      const at = ms(s.at);
      if (at == null) continue;
      if (s.state === "success") out.push({ type: "deploy", ok: true, sha: d.sha, at, url: s.url ?? null, detail: s.description ?? null });
      else if (s.state === "failure" || s.state === "error")
        out.push({ type: "deploy", ok: false, sha: d.sha, at, url: s.url ?? null, detail: s.description ?? `Production deployment ${s.state}` });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Completed post-deploy workflow runs as events, oldest first. Runs whose workflow is not a
 * post-deploy step, runs not yet completed, and cancelled or skipped runs are left out.
 * @param {any[]} runs
 */
export function workflowEvents(runs) {
  const out = [];
  for (const r of runs) {
    if (!isPostDeployWorkflow(r.workflow) || r.status !== "completed") continue;
    const at = ms(r.completedAt);
    if (at == null) continue;
    const failed = FAILED_CONCLUSIONS.has(r.conclusion);
    if (!failed && r.conclusion !== "success") continue;
    out.push({ type: "workflow", ok: !failed, sha: r.sha, workflow: r.workflow, at, createdAt: ms(r.createdAt) ?? at, url: r.url ?? null, detail: `${r.workflow} ${r.conclusion}` });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Everything the page and the alarm need for one app, from its deployments, main's commit graph and
 * its post-deploy workflow runs. Pure; `now` only trims the result to the 90-day window.
 *
 * changes   one per commit's FIRST successful Production deployment (a redeploy of a commit that
 *           was already live is not a change). Range = commits since the previous change.
 * attempts  commits with any terminal Production status or a failed post-deploy run.
 * failed    commits that failed: a failure/error status, a failed post-deploy run on that commit,
 *           or the next change within 24 hours being fix commits only (that next change is rework).
 * episodes  from the first failure while green to the next moment the app is green again: a
 *           successful deployment whose post-deploy runs (those started by then) all succeeded, or a
 *           successful re-run of the failed workflow on the live commit. end null = still open.
 * @param {{ deployments: any[], commits: any[], runs: any[], now: number, keepDays?: number }} input
 */
export function appTimeline({ deployments, commits, runs, now, keepDays = 90 }) {
  const graph = new Map(commits.map((c) => [c.sha, c]));
  const dEvents = deployEvents(deployments);
  const wEvents = workflowEvents(runs);

  // Changes: first success per commit.
  const changes = [];
  const seen = new Set();
  for (const e of dEvents) {
    if (!e.ok || seen.has(e.sha)) continue;
    seen.add(e.sha);
    const prev = changes.length ? changes[changes.length - 1] : null;
    const range = commitRange(graph, e.sha, prev ? prev.sha : null);
    const lead = prev && range.known ? leadTimes(graph, range.commits, e.at) : { authoringMs: null, mergeWaitMs: null };
    const fixOnly = prev && range.known ? isFixOnlyRange(graph, range.commits) : false;
    const rework = Boolean(prev && fixOnly && e.at - prev.at < REWORK_WINDOW_MS);
    changes.push({
      sha: e.sha,
      at: e.at,
      prevSha: prev ? prev.sha : null,
      commits: range.known ? range.commits.length : null,
      partial: range.partial,
      authoringMs: lead.authoringMs,
      mergeWaitMs: lead.mergeWaitMs,
      rework,
    });
  }

  // Attempts and failures, per commit.
  /** @type {Map<string, number>} */
  const firstAttempt = new Map();
  const touch = (sha, at) => {
    const t = firstAttempt.get(sha);
    if (t == null || at < t) firstAttempt.set(sha, at);
  };
  for (const e of dEvents) touch(e.sha, e.at);
  /** @type {Map<string, Set<string>>} */
  const failedBy = new Map();
  const fail = (sha, why) => {
    if (!failedBy.has(sha)) failedBy.set(sha, new Set());
    failedBy.get(sha).add(why);
  };
  for (const e of dEvents) if (!e.ok) fail(e.sha, "deploy");
  for (const e of wEvents) {
    if (e.ok) continue;
    touch(e.sha, e.at);
    fail(e.sha, `workflow:${e.workflow}`);
  }
  for (let i = 1; i < changes.length; i++) if (changes[i].rework) fail(changes[i - 1].sha, "fixed-within-24h");

  const episodes = failureEpisodes(dEvents, wEvents, runs);

  const since = now - keepDays * DAY_MS;
  return {
    changes: changes.filter((c) => c.at >= since),
    attempts: [...firstAttempt].filter(([, at]) => at >= since).map(([sha, at]) => ({ sha, at, failedBy: [...(failedBy.get(sha) ?? [])] })),
    episodes: episodes.filter((ep) => ep.end == null || ep.start >= since),
  };
}

/**
 * Failure episodes from deploy and workflow events (see appTimeline). A failure while an episode is
 * open joins it; the episode keeps the first failure's commit and kind (the alarm's key).
 * @param {any[]} dEvents
 * @param {any[]} wEvents
 * @param {any[]} runs  raw runs, for "which post-deploy runs had started on this commit by then"
 */
export function failureEpisodes(dEvents, wEvents, runs) {
  const events = [...dEvents, ...wEvents].sort((a, b) => a.at - b.at || (a.type === "deploy" ? -1 : 1));
  /** Post-deploy runs per commit, with created and completed times. */
  const runsBySha = new Map();
  for (const r of runs) {
    if (!isPostDeployWorkflow(r.workflow)) continue;
    if (r.conclusion === "cancelled" || r.conclusion === "skipped") continue;
    const list = runsBySha.get(r.sha) ?? [];
    list.push({ workflow: r.workflow, createdAt: ms(r.createdAt) ?? 0, completedAt: r.status === "completed" ? ms(r.completedAt) : null, ok: r.conclusion === "success" });
    runsBySha.set(r.sha, list);
  }
  /** Every post-deploy workflow on `sha` whose newest run started by t has finished green by t. */
  const workflowsGreen = (sha, t) => {
    const newest = new Map();
    for (const r of runsBySha.get(sha) ?? []) {
      if (r.createdAt > t) continue;
      const cur = newest.get(r.workflow);
      if (!cur || r.createdAt > cur.createdAt) newest.set(r.workflow, r);
    }
    for (const r of newest.values()) if (!r.ok || r.completedAt == null || r.completedAt > t) return false;
    return true;
  };

  const out = [];
  let open = null;
  let needDeploy = false;
  let liveSha = null;
  for (const e of events) {
    if (e.type === "deploy" && e.ok) liveSha = e.sha;
    if (!e.ok) {
      if (!open) {
        open = { start: e.at, end: null, sha: e.sha, kind: e.type === "deploy" ? "deploy" : `workflow:${e.workflow}`, detail: e.detail, url: e.url, failures: 1 };
        out.push(open);
        needDeploy = false;
      } else open.failures += 1;
      if (e.type === "deploy") needDeploy = true;
      continue;
    }
    // A failed deployment is recovered only by a later successful deployment (Vercel keeps the
    // older one live, so the live commit's workflows going green says nothing about it). A failed
    // workflow alone is also recovered by a successful re-run on the live commit.
    // Once a later deployment succeeded, only its post-deploy runs are left to wait for.
    if (e.type === "deploy") needDeploy = false;
    else if (needDeploy) continue;
    if (open && liveSha && e.sha === liveSha && workflowsGreen(liveSha, e.at)) {
      open.end = e.at;
      open = null;
    }
  }
  return out;
}

// ---- windows and summaries ----------------------------------------------------------------------

/**
 * The six numbers for one app or the whole ecosystem over `days`, from one or more timelines.
 * @param {{ changes: any[], attempts: any[], episodes: any[] }[]} timelines
 * @param {number} now
 * @param {number} days
 */
export function summarize(timelines, now, days) {
  const since = now - days * DAY_MS;
  const changes = timelines.flatMap((t) => t.changes.filter((c) => c.at >= since));
  const attempts = timelines.flatMap((t) => t.attempts.filter((a) => a.at >= since));
  const episodes = timelines.flatMap((t) => t.episodes.filter((e) => e.start >= since || e.end == null));
  const failed = attempts.filter((a) => a.failedBy.length > 0).length;
  const closed = episodes.filter((e) => e.end != null && e.start >= since).map((e) => e.end - e.start);
  return {
    days,
    changes: changes.length,
    perWeek: changes.length / (days / 7),
    authoring: spread(changes.map((c) => c.authoringMs).filter((v) => v != null)),
    mergeWait: spread(changes.map((c) => c.mergeWaitMs).filter((v) => v != null)),
    attempts: attempts.length,
    failed,
    changeFailRate: attempts.length ? failed / attempts.length : null,
    recovery: spread(closed),
    openFailures: episodes.filter((e) => e.end == null).length,
    rework: changes.filter((c) => c.rework).length,
    reworkRate: changes.length ? changes.filter((c) => c.rework).length / changes.length : null,
  };
}

/**
 * Changes per week for the last `weeks` weeks, oldest first (the small bars on the 90-day view).
 * @param {{ changes: any[] }[]} timelines
 */
export function weeklyChanges(timelines, now, weeks = 13) {
  const bars = new Array(weeks).fill(0);
  for (const t of timelines)
    for (const c of t.changes) {
      const w = Math.floor((now - c.at) / (7 * DAY_MS));
      if (w >= 0 && w < weeks) bars[weeks - 1 - w] += 1;
    }
  return bars;
}

/**
 * Open failure episodes older than ALARM_AFTER_MS, one per (app, sha, kind): the alarm's work list.
 * @param {{ slug: string, name: string, repo: string, episodes: any[] }[]} apps
 */
export function alarmCandidates(apps, now, after = ALARM_AFTER_MS) {
  const out = [];
  for (const a of apps)
    for (const e of a.episodes)
      if (e.end == null && now - e.start > after)
        out.push({ app: a.slug, name: a.name, repo: a.repo, sha: e.sha, kind: e.kind, failedAt: e.start, detail: e.detail, url: e.url });
  return out;
}

// ---- cost per change ----------------------------------------------------------------------------

const normPath = (s) => (s ?? "").replace(/[^A-Za-z0-9]/g, "-");

/**
 * The registry slug a Claude Code project directory belongs to, or null. A project dir is the
 * session's start directory with every non-alphanumeric character turned into "-" (older
 * transcripts kept "_"; both sides are normalized). The longest registry localPath that equals the
 * project or is a parent of it wins (".../centenarian-os/plans" is CentenarianOS). A helper worktree
 * under ai-builds/worktrees/<name> belongs to the app whose repo folder name starts <name> (the
 * convention: worktrees are named after the repo, "witus-learn-crew07"); longest folder name wins.
 * @param {string} project
 * @param {{ slug: string, localPath: string | null }[]} apps
 * @param {string} worktreeRoot
 */
export function projectSlug(project, apps, worktreeRoot = "/Users/bam/Code_NOiCloud/ai-builds/worktrees") {
  const p = normPath(project);
  let best = null;
  let bestLen = -1;
  for (const a of apps) {
    if (!a.localPath) continue;
    const k = normPath(a.localPath);
    if ((p === k || p.startsWith(`${k}-`)) && k.length > bestLen) {
      best = a.slug;
      bestLen = k.length;
    }
  }
  if (best) return best;
  const wt = `${normPath(worktreeRoot)}-`;
  if (!p.startsWith(wt)) return null;
  const name = p.slice(wt.length);
  for (const a of apps) {
    if (!a.localPath) continue;
    const folder = normPath(a.localPath.split("/").pop());
    if ((name === folder || name.startsWith(`${folder}-`)) && folder.length > bestLen) {
      best = a.slug;
      bestLen = folder.length;
    }
  }
  return best;
}

/**
 * Credits per app, the coordination line and what could not be mapped, for one window.
 * `rows` are archive sums grouped by project, model and is_sub (lib/ops/dora.ts); `priceOf` is
 * usage-core's costOf bound to the price table (null for an unpriced model).
 * @param {{ project: string, model: string, isSub: boolean, responses: number, input: number, cacheWrite5m: number, cacheWrite1h: number, cacheRead: number, output: number }[]} rows
 * @param {(r: any) => number | null} priceOf
 * @param {{ slug: string, localPath: string | null }[]} apps
 * @param {string} coordinationSlug  the repo whose sessions are the coordinating session
 */
export function creditsByApp(rows, priceOf, apps, coordinationSlug) {
  const empty = () => ({ credits: 0, responses: 0, unpriced: 0 });
  /** @type {Map<string, { credits: number, responses: number, unpriced: number }>} */
  const byApp = new Map();
  const coordination = { ...empty(), helperCredits: 0 };
  const unmapped = { ...empty(), projects: /** @type {string[]} */ ([]) };
  for (const r of rows) {
    const usd = priceOf(r);
    const slug = projectSlug(r.project, apps);
    let b;
    if (slug === coordinationSlug) b = coordination;
    else if (slug) {
      if (!byApp.has(slug)) byApp.set(slug, empty());
      b = byApp.get(slug);
    } else {
      b = unmapped;
      if (!unmapped.projects.includes(r.project)) unmapped.projects.push(r.project);
    }
    b.responses += r.responses;
    if (usd == null) b.unpriced += r.responses;
    else {
      b.credits += usd;
      if (b === coordination && r.isSub) coordination.helperCredits += usd;
    }
  }
  return { byApp, coordination, unmapped };
}

/**
 * Cost per change for one app: its own credits over its changes ("direct"), and that plus an even
 * share of the coordination line over every change in the ecosystem ("all-in"). Null with no changes.
 */
export function costPerChange({ appCredits, appChanges, coordinationCredits, allChanges }) {
  if (!appChanges) return { direct: null, allIn: null };
  const share = allChanges ? coordinationCredits / allChanges : 0;
  const direct = appCredits / appChanges;
  return { direct, allIn: direct + share };
}
