# witus.online operations runbook

Steps that run after a deploy, how they are automated, and how to run them by hand when the
automation can't. Required by the post-deploy automation rule (CLAUDE.md, shared rules v9): every
post-deploy step has a workflow, a manual fallback written here, and (later) a Run button on the
witus.online admin.

This repo has two separate Neon databases. Never point one's tooling at the other.

| Database | Schema | Migrations | drizzle config | Automated |
| --- | --- | --- | --- | --- |
| App (witus.online site) | `db/schema.ts` | `db/migrations/` | `drizzle.config.ts` | Not yet |
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
