# witus.online operations runbook

Steps that run after a deploy, how they are automated, and how to run them by hand when the
automation can't. Required by the post-deploy automation rule (CLAUDE.md, shared rules v9): every
post-deploy step has a workflow, a manual fallback written here, and (later) a Run button on the
witus.online admin.

This repo has two separate Neon databases. Never point one's tooling at the other.

| Database | Schema | Migrations | drizzle config | Automated |
| --- | --- | --- | --- | --- |
| App (witus.online site) | `db/schema.ts` | `db/migrations/` | `drizzle.config.ts` | Yes, below (from migration 0009) |
| Identity (WitUS Accounts, accounts.witus.online) | `db/identity-schema.ts` | `db/identity-migrations/` | `drizzle.identity.config.ts` | Yes, below |

Never use `db:push` / `drizzle-kit push` against either production database. Generate a migration
file and migrate.

## Identity database migrations

### What runs, and when

`.github/workflows/identity-migrate-production.yml` runs
`npx drizzle-kit migrate --config drizzle.identity.config.ts`:

- on every push to `main` that changes `db/identity-migrations/**`, and
- on demand: GitHub, **Actions**, **Migrate production identity database**, **Run workflow**.

It reads one repository secret, `IDENTITY_STORAGE_DATABASE_URL_UNPOOLED`: the direct (unpooled)
Neon connection string for the identity database. That is the first variable
`drizzle.identity.config.ts` looks for. If the secret is missing the job fails at its first step
with an `::error::` that points here. The job summary lists the migration files in the repo and the
rows in `drizzle.__drizzle_migrations`, so you can see what production has.

drizzle-kit applies only the journal entries whose `when` is newer than the newest
`created_at` in `drizzle.__drizzle_migrations`. Running it twice is a no-op.

### Order: migration first, code second

better-auth's drizzle adapter reads with `select()` over EVERY column declared in
`db/identity-schema.ts` and writes with `returning()`. If code that declares a new column reaches
production before the column exists, every session read fails (`column ... does not exist`), and
"Sign in with WitUS" breaks for every app. So a change that adds identity columns ships in two
merges:

1. A branch with only the migration files (`db/identity-migrations/**`). Merging it runs this
   workflow; wait for it to go green. The extra nullable columns are unused and harmless.
2. Then the branch that adds the columns to `db/identity-schema.ts` and the code that uses them.

Don't run `npm run db:identity:generate` between the two merges: `main` would have a snapshot that
lists the new columns and a schema that doesn't, and drizzle-kit would write a migration dropping
them.

### Set the secret (once)

Pipe the value so it is never pasted into a terminal, chat or log. Find the identity project's id
with `neon projects list` (it is the identity project, not the site's app database project):

```sh
neon connection-string --project-id <identity project id> \
  | gh secret set IDENTITY_STORAGE_DATABASE_URL_UNPOOLED --repo dapperAuteur/witus-online
```

`neon connection-string` returns the direct (unpooled) string unless `--pooled` is passed. If the
production identity database is on a non-default Neon branch or role, add `--branch` / `--role`
to match what Vercel's `IDENTITY_STORAGE_DATABASE_URL_UNPOOLED` uses.

### Check the history table first (before the first automated run)

drizzle-kit decides what to apply from `drizzle.__drizzle_migrations`. If production's identity
schema was created some other way (for example `db:push`) and `0000_far_namorita` is not recorded,
`migrate` would try to replay 0000 and fail on `CREATE TABLE "user"` because the table exists.

Read-only check, from a laptop with the production identity URL in `.env.local`, run from the repo
root (prints no secrets):

```sh
node -e '
const {config}=require("dotenv"); const r={}; config({path:".env.local",processEnv:r,quiet:true});
const u=new URL(r.IDENTITY_STORAGE_DATABASE_URL_UNPOOLED);
require("child_process").spawnSync("psql",["-X","-A","-t","-c",
 "select id, hash, created_at from drizzle.__drizzle_migrations order by id"],
 {stdio:"inherit",env:{...process.env,PGHOST:u.hostname,PGUSER:decodeURIComponent(u.username),
 PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:u.pathname.slice(1),PGSSLMODE:"require",
 PGOPTIONS:"-c default_transaction_read_only=on"}});'
```

Expected: one row per applied migration. For 0000 the `hash` is the SHA-256 of
`db/identity-migrations/0000_far_namorita.sql` (`shasum -a 256` it to compare) and `created_at` is
`1782822370487`, the `when` in `db/identity-migrations/meta/_journal.json`.

If the table is missing or 0000 is not recorded (baseline, only when the 0000 tables already
exist in production):

```sql
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('<sha256 of 0000_far_namorita.sql>', 1782822370487);
```

Run that in the Neon SQL editor for the identity project, then re-run the check.

### Manual fallback (run the migration from the laptop)

Use this only when the workflow can't run. From the repo root, with the production identity
database's direct URL in `.env.local` as `IDENTITY_STORAGE_DATABASE_URL_UNPOOLED` (for example from
`vercel env pull`, if the variable is not marked Sensitive):

```sh
npm ci
npm run db:identity:migrate
```

Expected output ends with `[✓] migrations applied successfully!`. Re-run the read-only check above;
the newest row's `created_at` should equal the newest `when` in `meta/_journal.json`.

### Migration log

| File | What it does | Additive |
| --- | --- | --- |
| `0000_far_namorita.sql` | better-auth tables for core + magic-link + jwt + oidcProvider | n/a (initial) |
| `0001_session_location.sql` | `session.city`, `session.region`, `session.country` (nullable text) for the Your devices page | Yes |

## App database migrations

### What runs, and when

`.github/workflows/migrate-production.yml` runs `npx drizzle-kit migrate --config drizzle.config.ts`:

- on every push to `main` that changes `db/migrations/**`, and
- on demand: GitHub, **Actions**, **Migrate production app database**, **Run workflow**.

It reads one repository secret, `STORAGE_DATABASE_URL_UNPOOLED`: the direct (unpooled) Neon
connection string for the site's database (the project Vercel's `STORAGE_DATABASE_URL` points at,
not the identity project). That is the first variable `drizzle.config.ts` looks for. If the secret
is missing the job fails at its first step with an `::error::` that points here. The job summary
lists the migration files and the rows in `drizzle.__drizzle_migrations`.

Before this workflow (through 0008), app migrations were applied by hand with `npm run db:migrate`
(tasks 106 and 126).

### Order

App migrations are additive (new tables, new nullable columns), and the pages that read a new table
show "not in this database yet" instead of failing, so code and migration can merge together:
Vercel deploys while the workflow runs, and the page works once the job is green. A change that
renames or drops a column needs two merges (migration first), as described for the identity
database above.

### Set the secret (once)

Pipe the value so it is never pasted into a terminal, chat or log. Find the site project's id with
`neon projects list` (the witus.online app database, not the identity project):

```sh
neon connection-string --project-id <site project id> \
  | gh secret set STORAGE_DATABASE_URL_UNPOOLED --repo dapperAuteur/witus-online
```

`neon connection-string` returns the direct string unless `--pooled` is passed. Add `--branch` /
`--role` if Vercel's `STORAGE_DATABASE_URL_UNPOOLED` uses a non-default branch or role.

### Check the history table (read-only)

From a laptop with the production app URL in `.env.local`, from the repo root (prints no secrets):

```sh
node -e '
const {config}=require("dotenv"); const r={}; config({path:".env.local",processEnv:r,quiet:true});
const u=new URL(r.STORAGE_DATABASE_URL_UNPOOLED);
require("child_process").spawnSync("psql",["-X","-A","-t","-c",
 "select id, created_at from drizzle.__drizzle_migrations order by id"],
 {stdio:"inherit",env:{...process.env,PGHOST:u.hostname,PGUSER:decodeURIComponent(u.username),
 PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:u.pathname.slice(1),PGSSLMODE:"require",
 PGOPTIONS:"-c default_transaction_read_only=on"}});'
```

Expected: one row per applied migration; the newest `created_at` equals the newest `when` in
`db/migrations/meta/_journal.json`. On 2026-10-31 the database `.env.local` points at had 9 rows
(0000 through 0008, newest `created_at` 1793220974459), so the first workflow run applies 0009 only.

### Manual fallback (run the migration from the laptop)

Use this only when the workflow can't run. From the repo root, with the production app database's
direct URL in `.env.local` as `STORAGE_DATABASE_URL_UNPOOLED`:

```sh
npm ci
npm run db:migrate
```

Expected output ends with `[✓] migrations applied successfully!`. Re-run the read-only check above.

### Migration log

| File | What it does | Additive |
| --- | --- | --- |
| `0000_auth_foundation.sql` | NextAuth tables: `user`, `account`, `session`, `verificationToken` | n/a (initial) |
| `0001_episodes.sql` | `episode` table and the `episode_status` / `podcast_show` enums | Yes |
| `0002_disctopia_import.sql` | `episode.disctopia_guid` (unique), `episode_number` nullable, drops the show+number unique | No (drops a constraint) |
| `0003_invitations.sql` | `invitation` table | Yes |
| `0004_gigantic_magik.sql` | `library_document` table | Yes |
| `0005_freezing_whizzer.sql` | `library_document.pdf`, `pdf_bytes` | Yes |
| `0006_aromatic_epoch.sql` | `service`, `service_snapshot` (admin costs) | Yes |
| `0007_claude_usage_snapshots.sql` | `claude_usage_snapshots` (admin usage) | Yes |
| `0008_claude_usage_responses.sql` | `claude_usage_responses` archive plus two indexes | Yes |
| `0009_operator_tasks.sql` | `operator_task`, `operator_task_event` (admin tasks) plus two indexes | Yes |
| `0010_library_epub.sql` | `library_document.epub`, `epub_bytes` (nullable; EPUB download on /admin/library) | Yes |
| `0011_dora_alarms.sql` | `dora_alarms` (failed-deploy alarm sends, /admin/dora) plus one index | Yes |

## Operator task sync (a laptop command, not a post-deploy step)

`/admin/tasks` shows every ecosystem repo's open operator tasks. Those live in gitignored
`plans/user-tasks/` folders on BAM's machine, so no workflow can read them; like
`scripts/sync-library.mjs`, the sync runs from the laptop:

```sh
node scripts/sync-user-tasks.mjs --dry-run   # parse every queue, no database
node scripts/sync-user-tasks.mjs --check     # read-only: what was marked done on the site
node scripts/sync-user-tasks.mjs             # upload (replaces each app's rows)
```

It reads the site database URL from `.env.local` (same variables as `sync-library.mjs`). A task
file that matches a secret pattern is not uploaded; the output names the file, the pattern and the
line, never the value. "Mark done" on the site only records the click (with an audit row in
`operator_task_event`); the next run lists those tasks with their file paths so the session moves
each file to `completed/`, and the upload after that drops the row.

## Production deploy check (/admin/tasks/deploys)

The Deploys tab reads GitHub's deployments API for every repo in `lib/roadmap/registry.ts`: the
newest `Production` deployment, its newest status, the newest successful one, and the head of
`main`. Red means the newest production deploy failed or the live deploy is not `main`'s head
("merged" is not "live"). Reads are cached five minutes; **Refresh now** expires the cache.

It uses `GITHUB_ROADMAP_TOKEN` (task 132), which needs **Deployments: Read-only** in addition to
Contents and Metadata. Without it the tab says so and every row reads "Could not read". Add it on
GitHub (Settings, Developer settings, Fine-grained tokens, the roadmap token, Edit, Repository
permissions); no Vercel change is needed because the token value stays the same.

## Unmerged branches (/admin/tasks/branches)

The Branches tab lists, per registry repo, every branch ahead of `main` (ahead and behind counts,
last commit, subject), with `fix/security-*` first, then `bundle/*`, and a Stale flag after 14 days
without a commit. One GraphQL query per 100 branches (`Ref.compare` against `main`), cached five
minutes under the same tag as Deploys. It needs only Contents and Metadata read on
`GITHUB_ROADMAP_TOKEN`. It is read-only: each row links to GitHub's compare page, and merging stays
there.

## DORA metrics and the failed-deploy alarm (/admin/dora)

The page computes deployment frequency, lead time (authoring and merge wait), change fail rate,
recovery time, rework rate and credits per change for every registry repo over 30 and 90 days.
Full definitions: `docs/02-dora-metrics.md`. It reads GitHub with `GITHUB_ROADMAP_TOKEN` (one
cached entry, five minutes, expired by **Refresh now**) and the usage archive from the app database.

Token permissions: Contents, Metadata, Deployments and Commit statuses read (as Deploys), plus
**Actions: Read-only** for the post-deploy workflow runs (task 159). Without Actions read the page
says "needs Actions read on the token" and computes everything else from deployment statuses.

### The alarm

`.github/workflows/dora-alarm.yml` runs hourly (minute 17) and on **Run workflow**. It POSTs to
`https://www.witus.online/api/cron/dora-alarm` with `Authorization: Bearer $WITUS_CRON_SECRET`.
The route emails `ADMIN_EMAIL` through Mailgun once per failure open more than 60 minutes, records
it in `dora_alarms`, and marks rows resolved when the app is green again (the Deploys tab banner
reads the unresolved rows). It needs, on the site, `CRON_SECRET`, `GITHUB_ROADMAP_TOKEN`,
`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `ADMIN_EMAIL` and `EMAIL_FROM`; in GitHub, the repository
secret `WITUS_CRON_SECRET` with the same value as `CRON_SECRET`.

Answers (JSON `{ ok, data }` or `{ ok: false, error, code }`):

| HTTP | Meaning |
| --- | --- |
| 200 | Ran. `data.alarms` open failures past an hour, `sent` emailed now, `alreadySent`, `resolved` |
| 401 | Wrong or missing bearer: the two secrets differ |
| 502 | Ran, but a send or a row save failed (`mail_not_configured` or `partial_failure`); the next hour retries |
| 503 | `cron_secret_missing` (set CRON_SECRET on Vercel, redeploy), `github_token_missing`, or `no_table` (migration 0011 has not run) |

### Set the secret (once)

One generated value, piped to both places and to the login keychain (for the manual fallback), in
one terminal, never pasted:

```sh
cd /Users/bam/Code_NOiCloud/ai-builds/gemini/witus
v="$(openssl rand -hex 32)"
vercel env rm CRON_SECRET production --yes 2>/dev/null   # only if an older value exists
printf %s "$v" | vercel env add CRON_SECRET production
printf %s "$v" | gh secret set WITUS_CRON_SECRET --repo dapperAuteur/witus-online
security add-generic-password -U -a "$USER" -s witus-cron-secret -w "$v"
unset v
vercel redeploy www.witus.online --target production
```

The daily cost-snapshot cron uses the same `CRON_SECRET`; Vercel sends the current value, so it
keeps working.

### Manual fallback (run the alarm check from the laptop)

First choice: GitHub, witus-online, Actions, "DORA failed-deploy alarm", **Run workflow**. From the
laptop, with the value from the keychain (never typed; the header goes through stdin, so it is not
in the process list or the shell history):

```sh
printf 'Authorization: Bearer %s\n' "$(security find-generic-password -s witus-cron-secret -w)" \
  | curl -sS -X POST -H @- https://www.witus.online/api/cron/dora-alarm | jq .
```

Expected when nothing is failing: `{"ok":true,"data":{"alarms":0,"sent":0,"alreadySent":0,"resolved":0,"errors":[]}}`.
A run is safe to repeat: an alarm already emailed is counted in `alreadySent` and never sent again.
