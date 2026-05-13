## ⚠️ Ecosystem repo identity (don't confuse these)

The site **brandanthonymcdonald.com** (BAM's personal portfolio) lives in `/Users/bam/Code_NOiCloud/ai-builds/claude/bam-landing-page/` — **NOT** `bam-portfolio`. A stray directory at `/Users/bam/Code_NOiCloud/projects/bam-portfolio/` exists from a prior misplaced `Write` call (parent dirs auto-created); it is not a real repo. When asked to work on the brandanthonymcdonald.com codebase, target `bam-landing-page`.

This mistake has been made more than once. If you're about to write a file under `projects/bam-portfolio/` or refer to it as the BAM portfolio repo, stop and re-read this note.

---

## Ecosystem onboarding rule — when adding a NEW product to the WitUS ecosystem

When a new product joins the WitUS ecosystem (a new app, sub-site, or shared infrastructure repo), do these things in order:

1. **Add a CLAUDE.md to the new repo** that opens with the same "Ecosystem repo identity" warning as above (the bam-landing-page / bam-portfolio note). This is a one-paragraph paste; the same text lives in every other ecosystem repo. The note pre-empts a recurring identity mistake — every new repo gets it on day one.
2. **Add the operator-task rule below** to the new repo's CLAUDE.md too — same paragraph as in every other ecosystem repo.
3. **Add the branch-hygiene rule below** to the new repo's CLAUDE.md — the short pointer version that names all three halves (Half 1: Claude branches/commits/pushes; Half 2: BAM merges between sessions; Half 3: keep branches small and bundle multiple branches before handoff) and points back here for the full text.
3. **Update this list** (the witus repo's CLAUDE.md) so the new product is named in the ecosystem identity section if it has a name that's confusable with anything else.
4. **Add the new product to `plans/ecosystem/README.md`** product index in this repo.
5. **Update [the consolidated playbook ebook](plans/playbook/2026-04-27-witus-commercial-playbook.md)** §0 Master Source Index and §9 Pre-Launch Features so the new product's launch-prep doc is linked.
6. **Update the witus auto-memory** at `~/.claude/projects/-Users-bam-Code-NOiCloud-ai-builds-gemini-witus/memory/` so the rule list reflects the new product's existence.

The principle: identity confusion is a *first-day* problem. Catching it on day one in CLAUDE.md is cheap; catching it after multiple sessions of misnamed work is expensive and BAM has paid that cost more than once.

---

## Operator-task rule — when work needs BAM to do something outside the editor

**Anytime Claude proposes work that requires BAM to do something outside the editor** — account signup, API key generation, DNS change, vendor outreach, env-var rotation, dashboard configuration, secret generation, biometric appointment, PR review/merge, anything BAM does in an external tool — **Claude MUST create a task file under that repo's `./plans/user-tasks/`** so the action is captured, sequenced, and visible at the next session start. No exceptions for "small" steps; if BAM has to leave the editor, it needs a file.

This rule is in force across **every** ecosystem repo. The canonical reference implementations are:
- `gemini/witus/plans/user-tasks/00-descriptions.md` — ecosystem-wide queue (Keap, IRL events, weekly retros, consultant reconciliation, cross-product decisions)
- `claude/bam-landing-page/plans/user-tasks/00-descriptions.md` — repo-local queue (deploy, env vars, vendor outreach specific to brandanthonymcdonald.com)
- `claude/witus-inbox/plans/user-tasks/` — same shape

### File location and naming

- **Path:** `./plans/user-tasks/` in the repo where the action is performed (or the repo whose work the action unblocks).
- **Filename:** `NN-short-slug.md` — two-digit numeric prefix, kebab-case slug. Use the next available number; do not skip numbers.
- **Index:** `00-descriptions.md` is the queue's table-of-contents. Update its `Current task index` table whenever a new task file is added or an existing task is closed.

### Required sections in every task file

Mirroring the witus + bam-landing-page + witus-inbox format:

1. **Scope tag** at the top — `[ecosystem]`, `[witus]`, `[portfolio]`, `[inbox]`, `[env]`, `[deploy]`, `[vendor]`, `[trip]`, etc.
2. **What + why** — one-sentence summary AND **explicit blocking details**. Spell out: what breaks if BAM doesn't do this, what downstream launch/feature/deploy this unblocks, and the hard deadline if any. Example phrasing from `bam-landing-page/plans/user-tasks/01-track-e-launch-prep-coordination.md`: *"Without these external steps, the receiver returns 401 on every submission and the launch CTAs go to a broken form. This unblocks the May 4 FlashLearnAI launch."*
3. **Steps** — numbered actions BAM performs in the external tool. Be concrete about WHICH dashboard, WHICH menu, WHICH field. If a step requires generating a secret, give 2–3 alternative commands BAM can paste (`openssl`, Node `crypto`, Python `secrets`).
4. **What Claude will use** — env vars, URLs, file paths, or repo state Claude expects to read once BAM completes the task.
5. **How to mark done** — usually "delete this file" or "move to completed/".
6. **Related** — link back to the source plan(s), implementation files, and any sibling tasks in other repos.

### `00-descriptions.md` index columns (non-negotiable)

The task-index table at the bottom of every `00-descriptions.md` must include these columns: `# | Title | Scope | Blocks | Status`.

The **Blocks** column is the column BAM scans to triage the queue. Every row must name what downstream work the task unblocks — a launch date, a feature ship, a downstream task, an external dependency. "Pending" alone is not enough; "Pending — blocks May 4 FlashLearnAI launch" is.

### Ecosystem-wide vs repo-local

- **Ecosystem-wide** tasks (Keap, IRL events, weekly retros, consultant reconciliation, cross-product decisions, travel/visa, ecosystem-wide gmail filters) live in the canonical witus queue at `gemini/witus/plans/user-tasks/`.
- **Repo-local** tasks (deploy, env vars, vendor outreach specific to one product, that repo's PR review queue) live in that repo's own `./plans/user-tasks/`.
- Every repo-local `00-descriptions.md` should explicitly point at the canonical witus queue and tell Claude to read it first at session start. See `bam-landing-page/plans/user-tasks/00-descriptions.md` for the canonical phrasing.

### When NOT to create a user-tasks file

- Pure code work — `./plans/NN-*.md`.
- Bug reports — `./plans/bugs/`.
- Future / parked ideas — `./plans/future/`.
- Long-running engineering notes — those don't go here.
- Trivial one-line context updates that don't actually require a user action.

### Why this rule exists

Without it, Claude proposes work that silently depends on BAM having done a dashboard step, and BAM has no central queue to scan. The bam-landing-page launch came within reach of shipping `/hire` and `/partner` forms that would 401 on every submission because the HMAC secret + Inbox slug registration were never written down as user tasks. The user-tasks queue is the single artifact BAM scans before each session to know what's blocking what — if it isn't there, it doesn't get done in time.

---

## Branch-hygiene rule — BAM merges, and BAM merges between sessions

In force across **every** ecosystem repo. Two halves to the rule:

### Half 1 — Claude branches, commits, pushes; BAM merges.

Anytime Claude is about to make a code change, the contract is **branch → commit → push → stop.** Never `git checkout main && git merge`. Never `git push --force` to a shared branch. After pushing, hand back the branch name + a one-line summary and stop.

- Before any `git commit`, run `git branch --show-current`. If it is `main`, branch first (`feat/`, `fix/`, `chore/`, etc.).
- Re-check the current branch **before every commit**, not just at branch creation. (See Half 2 for why this matters mid-session.)
- After `git commit`, push with `git push -u origin <branch>` on the first push; plain `git push` thereafter.
- The only exception: if BAM explicitly says "merge X into main" or "I'm not going to merge this myself," that one-off is authorized. The default stays hands-off.

### Half 2 — BAM merges committed branches between sessions by default.

When a session ends with one or more pushed feature branches, BAM merges them via the GitHub UI before starting the next session, unless explicitly told otherwise. This means:

- **At session start,** assume any prior session's pushed branches are already merged into `main` and the local checkout is fresh-from-main. Run `git status` + `git log --oneline -5` first; don't build follow-up work on a stale branch from the previous session without checking.
- **Mid-session, after a push,** BAM may merge in a separate window. The local checkout may fast-forward to `main` quietly. **This is the trap.** If you commit again without re-checking the current branch, you can land code directly on `main` by accident, bypassing the merge gate. Re-check `git branch --show-current` before every commit, not just at the start of work.
- **If you need a continuous branch across multiple commits in one session,** keep working on it locally and push at the end. Don't push partial work expecting the branch to stay un-merged.

### Why Halves 1 + 2 exist

The recurring failure mode: Claude pushes a feature branch, BAM merges via GitHub UI mid-session (a few-second action that's invisible from the editor), Claude's local `main` fast-forwards, Claude makes follow-up edits and commits, the commit lands directly on `main`. The work itself is fine but the merge gate is bypassed and the change skips review. Re-checking `git branch --show-current` before every commit prevents the silent-fast-forward trap.

### Half 3 — Keep branches small; bundle them before handoff.

When a session produces multiple unrelated changes, each gets its own small, single-concern branch (`feat/`, `fix/`, `chore/`, `docs/`). At handoff, **Claude consolidates** the small branches into one bundle branch so BAM only does ONE merge to `main`:

1. **One concern per branch.** Don't pile two unrelated changes onto one feature branch. If you find yourself touching three unrelated areas, open three branches.
2. **Pick a bundle branch name** like `bundle/<short-slug>-YYYY-MM-DD` (e.g. `bundle/track-e-2026-04-27`). Branch it from the same base your small branches share — usually `main`.
3. **Merge the small branches into the bundle in lowest-conflict-risk order first.** Heuristic: docs/markdown changes before code changes; leaf-file changes before refactors; single-file changes before multi-file. Use `git merge --no-ff <branch>` so individual commits stay intact and BAM can `git log --first-parent` to drill into per-concern history later. **`--no-ff` is non-negotiable — don't squash.**
4. **Resolve any 3-way merge conflicts during bundling.** Don't punt them to BAM. The bundle's job is to land conflict-free on top of the current `main`.
5. **Run a final `tsc + lint + build` against the bundle** before push. If the bundle is broken, the bundle isn't done — fix it on the bundle branch (or back-port the fix to the offending small branch and re-merge).
6. **Push the bundle branch** (`git push -u origin bundle/...`).
7. **File ONE user-task** at `./plans/user-tasks/NN-merge-bundle-<slug>.md` describing: what's in the bundle (list of small branch names + one-line summaries), what was checked (tsc/lint/build green), the one merge command BAM runs (typically `git checkout main && git merge --ff-only origin/bundle/<slug> && git push`), and the small branches that can be deleted after the bundle merges.

BAM merges the bundle to `main` and pushes `main`. That's the one-action handoff.

### Why Half 3 exists

A session that produces 6 small branches creates 6 PRs and 6 merges for BAM — that's friction and BAM ends up batching them in his head anyway. Bundling them into one branch with `--no-ff` preserves per-concern history while cutting BAM's merge work to one action. The tsc+lint+build gate on the bundle catches integration issues that individual-branch CI wouldn't (because each small branch was tested in isolation against `main`, not against its sibling branches that haven't merged yet).

The principle: small branches for *authoring* (one concern per change, easy to revert, easy to drill into); bundle branch for *handoff* (one merge for BAM, integration tested, conflict-free).

### Onboarding action when adding a new ecosystem repo

Per the "Ecosystem onboarding rule" above, every new repo's `CLAUDE.md` opens with the identity warning and the operator-task rule. **Add this branch-hygiene rule too** — same shape as the operator-task paragraph: short summary of all three halves in the new repo's CLAUDE.md, full text here.

---

## Citation rule — APA 7 in-line + References for all curriculum and professional/business writing

All **curriculum content** (course materials, episode outlines, teacher packets, lesson plans), all **professional writing** (white papers, partnership briefs, partner-facing decks), and all **business writing** (proposals, grant applications, sponsor pitches, investor materials) ecosystem-wide uses **APA 7 in-line citations** with a `## References` section at the end of each document.

This convention was established by the BetterViceClub (BVC) curriculum at CentenarianOS Academy. Sibling curricula and writing must match for cross-product consistency, educator credibility, and grant-reader expectations.

### How to apply

- **In-line parenthetical:** `(Author, Year)` for paraphrases; `(Author, Year, p. X)` for direct quotes.
- **In-line narrative:** `Author (Year)` when the author's name is the sentence subject; `Author (Year, p. X)` for a quote.
- **Organization as author, first reference:** `(Centers for Disease Control and Prevention [CDC], 2024)`. Subsequent references: `(CDC, 2024)`.
- **Multiple authors:** two — `(Smith & Jones, 2020)`. Three or more — `(Smith et al., 2020)`.
- **Undated source:** `(Author, n.d.)`. Common for internal documents and undated webpages.
- **Every file with citations ends with a `## References` section** in alphabetical order, hanging-indent format. Standard APA 7 reference entries for each source cited.
- **Vocabulary CSVs and similar tabular sources:** the source column may use the shortened parenthetical form (e.g., `Park Tool, 2020`) with the full reference appearing in the packet's main `mechanics.md` (or wherever the source first appears in long-form prose).
- **One reference list per file** is the default. For tightly-coupled files (a packet's `mechanics.md` + `engineering.md` + `pedagogy.md` + `community.md`), each file carries its own `## References` listing only the sources cited *in that file*. Some duplication across sibling files is acceptable.

### When NOT to use APA in-line

These categories are out of scope for the rule:

- Code comments, code-level documentation (READMEs, ARCHITECTURE.md), engineering decision logs.
- Internal Slack / Discord / SMS / email exchanges.
- `plans/user-tasks/*` files and other operator-facing working notes.
- `BACKLOG.md`-style triage files.
- Conversation transcripts.

The rule applies to anything that's *publishable*, *teachable*, or *partner-facing* — content that an outside reader (educator, grantmaker, partner organization) will judge for rigor and trustworthiness.

### Why this rule exists

The BVC curriculum was built with academic-grade citation discipline because a fraction of its eventual audience is teachers who will only adopt material that meets their professional standards. The same is true of every ecosystem curriculum (RideWitUS apron-tier content, Wanderlearn 360° lessons, FlashLearnAI deck commentary). It is also true of grant applications and sponsor materials: foundations and corporate sponsors evaluate writing partly on its scholarly rigor. Loose attribution loses both classrooms and dollars; in-line APA earns both.

### Onboarding action when adding a new ecosystem repo or new curriculum product

Per the "Ecosystem onboarding rule" above, every new repo's `CLAUDE.md` includes the identity warning, the operator-task rule, and the branch-hygiene rule. **Add a short pointer to this citation rule** as well — one paragraph in the new repo's CLAUDE.md that names the rule and points back here for the full text.
