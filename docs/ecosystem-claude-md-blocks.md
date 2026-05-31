# Canonical CLAUDE.md blocks (paste-ready)

Single source of truth for the standard blocks every WitUS ecosystem repo's `CLAUDE.md` carries. When onboarding a new repo (or bringing an old one up to standard), paste these five blocks and swap the `<PLACEHOLDERS>`. Full rationale lives in this repo's [`CLAUDE.md`](../CLAUDE.md). Kept in `docs/` because `plans/` is gitignored.

See also the `.githooks/pre-commit` guard at the end — copy that file into each repo and activate it once per clone.

---

## Block 1 — Ecosystem repo identity (open every CLAUDE.md with this)

```md
## ⚠️ Ecosystem repo identity (don't confuse these)

This repo — **<REPO-DIR-NAME>** — is **<Product.WitUS>** (<public-url>). Don't confuse it with the other WitUS apps. Full ecosystem identity + product index: `gemini/witus/CLAUDE.md`.

The site **brandanthonymcdonald.com** (BAM's personal portfolio) lives in `claude/bam-landing-page/` — **NOT** `projects/bam-portfolio/` (the retired legacy static site). Target `bam-landing-page` for that site.
```

## Block 2 — Operator-task rule

```md
## Operator-task rule — capture user actions in `./plans/user-tasks/`

When Claude proposes work that needs BAM to do something outside the editor (account signup, API key, DNS change, vendor dashboard, env-var rotation, secret generation, PR review/merge, etc.), Claude MUST create a `./plans/user-tasks/NN-slug.md` file in this repo. **No exceptions for "small" steps.**

Required sections per task file: **Scope tag** · **What + why** (with explicit *what this blocks* detail and any hard deadline) · **Steps** · **What Claude will use** · **How to mark done** · **Related**. Keep `./plans/user-tasks/00-descriptions.md` updated with columns `# | Title | Scope | Blocks | Status` — the `Blocks` column is the one BAM scans. Full rule: `gemini/witus/CLAUDE.md` §"Operator-task rule".

**Ecosystem-wide tasks** (Keap, IRL events, weekly retros, consultant reconciliation, cross-product decisions) live in the canonical witus queue at `gemini/witus/plans/user-tasks/`. **Repo-local tasks** live here. Read the witus queue at session start before dependent work.
```

## Block 3 — Branch-hygiene rule (all three halves)

```md
## Branch hygiene — BAM merges, between sessions by default

**Half 1.** End-of-branch contract: branch → commit → push → stop. Claude does not run `git checkout main && git merge`. Never `--force` to shared branches. After push, hand back the branch name + summary and stop.

**Half 2.** BAM merges committed-and-pushed branches via the GitHub UI before the next session starts, unless explicitly told otherwise. At session start the local checkout is typically fresh-from-main. **Mid-session, after a push, BAM may merge in a separate window and the local checkout silently fast-forwards to `main`.** Re-check `git branch --show-current` before EVERY commit, not just at branch creation, or you risk landing follow-up commits directly on `main` and bypassing the merge gate.

**Half 3.** Keep branches small (one concern per branch). When a session produces multiple branches, Claude consolidates them into one `bundle/<slug>-YYYY-MM-DD` branch before handoff: merge the small branches in lowest-conflict-risk order using `git merge --no-ff` (preserves per-concern history — non-negotiable, no squash), resolve any 3-way conflicts during bundling, run a final `tsc + lint + build` against the bundle, push, and file ONE user-task at `./plans/user-tasks/NN-merge-bundle-<slug>.md` for BAM to merge bundle → main. The small branches stay on the remote for drill-down history; **BAM does one merge, not N.**

A checked-in `.githooks/pre-commit` guard refuses commits made directly on `main`/`master`. Activate it once per clone: `git config core.hooksPath .githooks`.

Full rule with rationale: `gemini/witus/CLAUDE.md` §"Branch-hygiene rule".
```

## Block 4 — Plans convention

```md
## Plans convention

All implementation plans live in `./plans/` as markdown named `NN-description-of-plan.md` — two-digit numeric prefix, kebab-case slug, next available number, don't skip. Sub-queues: `./plans/user-tasks/NN-slug.md` (operator tasks), `./plans/bugs/`, `./plans/future/`. (`plans/` is typically gitignored — local working notes.)
```

## Block 5 — Citation-rule pointer

```md
## Citation rule

Anything publishable, teachable, or partner-facing (curriculum, help articles meant as teaching content, white papers, grant/sponsor/partner writing) uses APA 7 in-line citations with a `## References` section. Code docs, internal notes, and `plans/user-tasks/*` are out of scope. Full rule: `gemini/witus/CLAUDE.md` §"Citation rule".
```

---

## The pre-commit hook — copy to `.githooks/pre-commit` in each repo, then `chmod +x`

```sh
#!/bin/sh
# WitUS branch-hygiene guard: never commit directly on main/master.
# Claude branches -> commits -> pushes; BAM merges. See CLAUDE.md
# §"Branch hygiene". Activate once per clone (not automatic on checkout):
#   git config core.hooksPath .githooks
# Genuine one-off override: git commit --no-verify

branch=$(git symbolic-ref --short HEAD 2>/dev/null)

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "" >&2
  echo "  Refusing to commit directly on '$branch'." >&2
  echo "  Branch first:  git checkout -b feat/... (or fix/ chore/ docs/)" >&2
  echo "  BAM merges to $branch; Claude never commits on it directly." >&2
  echo "  Override for a real one-off:  git commit --no-verify" >&2
  echo "" >&2
  exit 1
fi

exit 0
```
