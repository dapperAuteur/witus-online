# DORA metrics and the failed-deploy alarm

The page is `/admin/dora` on witus.online (owner only). It shows, per app and for the whole
ecosystem, over the last 30 or 90 days: the five DORA metrics (deployment frequency; lead time for
changes, split in two; change fail rate; failed deployment recovery time; deployment rework rate)
plus credits per change. Everything is read-only and computed from automatic signals. This file is
the full definition; the page carries a short version. BAM approved the design on 2026-11-10; the
"Refinements" section lists every place the real data forced a more exact rule.

Code: `lib/ops/dora-core.mjs` (pure rules, tested by `scripts/lib/dora.test.mjs`),
`lib/ops/dora.ts` (GitHub and usage-archive reads), `lib/ops/dora-alarm.ts` (the alarm),
`app/admin/dora/`, `app/api/cron/dora-alarm/route.ts`, `.github/workflows/dora-alarm.yml`.
Runbook: `docs/01-operations.md`, "DORA metrics and the failed-deploy alarm".

## Definitions

### Deployment records

A deployment is a GitHub **Production** deployment of `main` (Vercel records each one), read with
its statuses. Environments read: `Production`, and `Production U+2013 <repo name>` for a repo linked
to more than one Vercel project (Vercel names the environment after the project then; U+2013 is
the en dash character GitHub shows between the words, written out here because this repo's docs
use no dashes).

For the commits on main's first-parent line that are **older than the repo's oldest GitHub
Production deployment**, the Vercel commit status on that commit stands in. That covers a Vercel
project whose GitHub deployments were turned off (invest-witus until 2026-11-04). The row says
"read from Vercel's commit status" when it uses these records. Context matched: `Vercel`, or
`Vercel U+2013 <repo name>`.

### Change, and deployment frequency

A **change** is a commit's **first successful** Production deployment. Every push to main deploys,
and most merges are fast-forwards, so there is no merge commit to count. A redeploy of a commit that
was already live (an env change, a retry) is not a new change. Deployment frequency is the number
of changes in the window, also shown per week.

The change's **commit range** is every commit reachable from its commit and not from the previous
change's commit, following every parent, so the side commits of a `--no-ff` bundle merge count.

### Lead time for changes, in two parts

- **Authoring**: oldest to newest author date among the range's commits.
- **Merge wait**: newest author date in the range to the deployment's success time.

Merge commits are skipped for both (they are the bundle's plumbing, not authored work). Shown as
the median and the 90th percentile (linear interpolation between ranks), never only a mean. The
first change in what was read has no previous deployment, so it has no lead time.

### Change fail rate

Failed commits divided by commits that tried to deploy in the window. A commit **tried** when it
got any success, failure or error Production status, or a failed post-deploy run. It **failed** on
any of these automatic signals, never a hand-entered incident:

1. A Production deployment status of `failure` or `error` on that commit.
2. A post-deploy workflow run on that commit, on branch main, that concluded `failure`,
   `timed_out` or `startup_failure`. A post-deploy workflow is one whose name contains migrate,
   seed or sync (for example "Migrate production database", "Migrate production identity
   database", "Migrate Neon database", "Seed production courses"). `cancelled` and `skipped` runs
   are ignored. The app is live against the wrong schema or data, so the deployment counts as
   failed even though Vercel said success.
3. The **next** change, within 24 hours, is made only of fix commits (see rework).

### Failed deployment recovery time

An episode starts at the first failure (signal 1 or 2) while the app was green, and ends at the
next moment the app is green again:

- a later successful Production deployment whose post-deploy workflows are green, meaning every
  post-deploy workflow whose newest run on that commit had started by then finished successfully;
- or, when the episode is only failed workflows, a successful re-run of the workflow on the live
  commit (the usual fix for a failed migration or seed).

A failed deployment is never recovered by the live commit's workflows going green, because Vercel
keeps the older deployment live and the failed one is still failed. Failures inside an open episode
join it. Shown as median and 90th percentile of closed episodes that started in the window, plus the
count still open.

### Deployment rework rate

Changes within 24 hours of the previous change whose range has at least one non-merge commit and
every non-merge subject starts with `fix`, `hotfix` or `revert` (any case; `fixup!` and `fixture`
do not match), divided by all changes in the window. The previous change counts as failed
(signal 3). It has no recovery time and no alarm, because its failure time is unknown.

### Credits per change

Credits come from `claude_usage_responses` (one row per model response, priced with
`scripts/lib/claude-prices.json`, 1 credit = 1 US dollar of API list price). Each row's `project`
(the Claude Code project directory) is mapped to a registry repo:

- the project equals a registry app's `localPath`, or is a folder inside it, with every
  non-alphanumeric character treated as `-` (older transcripts kept `_`); the longest match wins;
- a helper worktree, `ai-builds/worktrees/<name>`, belongs to the app whose repo folder name
  `<name>` starts with (worktrees are named after the repo, for example `witus-learn-crew07`).

The witus repo's sessions are the **coordinating session**: they and the helper agents they start
are one "coordination" line (helpers shown separately inside it), not witus-online's own cost.

- **Direct**: an app's own credits in the window over its changes in the window.
- **All-in**: direct plus the coordination credits spread evenly over every change in the ecosystem.
- **Ecosystem**: all credits not in coordination (including unmapped projects) over all changes is
  direct; every credit over all changes is all-in.

Responses whose model is missing from the price table are counted at zero and their number is shown.
Projects that map to no repo are listed by name. The archive starts 2026-08-27, so a 90-day window
before 2026-11-25 is shorter than 90 days for credits; the page says so.

## The alarm

A Production deployment or post-deploy workflow failed for **more than 60 minutes** with no later
green deployment of that app (an open episode older than an hour) sends BAM **one** email through
Mailgun to `ADMIN_EMAIL`: app, commit, what failed, since when, the failure log link, and links to
Deploys and this page. One email per episode, keyed by the episode's first failure (app, commit,
kind); `dora_alarms` records it so it never repeats. The Deploys tab shows the same as a banner
until a later check finds the app green.

Trigger: `.github/workflows/dora-alarm.yml`, hourly (minute 17) and by hand, POSTs to
`/api/cron/dora-alarm` with `Authorization: Bearer <CRON_SECRET>`. GitHub Actions holds the value as
`WITUS_CRON_SECRET`; it must equal Vercel's `CRON_SECRET`. Vercel's daily cron (cost snapshot) is
unchanged.

## Pitfalls BAM accepted

- **Tiers are not targets.** The published elite, high, medium and low tiers describe teams. This
  is one person and a set of agents; the page never shows a tier or a target.
- **Frequency and lead time are distorted on purpose.** Changes are batched into bundles and BAM
  merges between sessions, so merge wait is mostly the session rhythm, and one bundle merge is one
  change however much it holds. Read them as observations.
- **Outages a deploy did not cause are outside these metrics.** A vendor outage, an expired key or a
  full database with no failed deploy or workflow never shows here.
- **"fix" is a naming convention, not proof.** A fix commit that follows a change by chance still
  makes that change "failed" and the fix "rework".
- **A next deployment with no post-deploy runs counts as green**, even if the migration that failed
  earlier is still unapplied (a migrate workflow runs only when migration files change).

## Refinements the data forced (2026-11-10)

1. **Multi-project environment names.** fit-t-cent-assessments has two Vercel projects, so its
   deployments are in `Production U+2013 fit-t-cent-assessments` (and a `...-spike` project). Only the
   project named after the repo is read. The Deploys tab still asks for `Production` only and falls
   back to the `Vercel` context, so it shows this repo wrong; that is a separate fix.
2. **Commit-status records are a fallback by date, not by repo.** invest-witus has GitHub
   deployments since 2026-11-04, and create-witus has none at all, so the status fallback applies to
   commits older than a repo's oldest deployment rather than to a fixed list of repos. It reads
   first-parent commits only; a fast-forwarded commit may still carry a preview build's status, so
   these records are approximate.
3. **A deployment's statuses change over time.** Vercel reuses one GitHub deployment for redeploys
   of the same commit, so one deployment can go failure, success, failure. Every success, failure or
   error status is its own event; a change is the first success per commit.
4. **A failed redeploy of the live commit counts as a failure** (signal 1). The signal is automatic
   and cannot tell a retry from a first attempt.
5. **Recovery of a failed migration by re-run.** Failed migrations and seeds are usually fixed with a
   `workflow_dispatch` re-run on the same commit, not a new deployment, so a successful re-run on the
   live commit also ends a workflow-only episode.
6. **Merge commits are skipped** for author dates and the fix-only test.
7. **Rework attribution.** The fix-only change is the rework; the change before it is the failure,
   with no recovery time and no alarm.
8. **Coordination includes helpers.** Since 2026-10-15 every response in the archive is under the
   witus project, most of them helper agents working in other repos. So direct credits are near zero
   for most apps and the all-in figure is the useful one until the usage script records each
   response's working directory.
9. **The alarm table has three extra columns**: `resolved_at` (clears the banner), `detail` (what the
   email said) and `created_at`. There is no general audit table in this repo, so each row is the
   audit record of its send. A send that fails, or Mailgun not being configured, leaves `sent_at`
   empty and the next hourly check retries.
10. **Nav placement.** Deploys is a tab inside Tasks, so the DORA link sits in the main admin nav
    right after Tasks, and the Deploys tab links to it.
11. **Bounds.** Per repo: up to 300 deployments back to 90 days, up to 800 commits of main back to
    100 days (a row notes when that cap cut the history), and 100 runs per post-deploy workflow.
