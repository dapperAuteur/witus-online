## ⚠️ Ecosystem repo identity (don't confuse these)

The site **brandanthonymcdonald.com** (BAM's personal portfolio) lives in `/Users/bam/Code_NOiCloud/ai-builds/claude/bam-landing-page/` — **NOT** `bam-portfolio`. A stray directory at `/Users/bam/Code_NOiCloud/projects/bam-portfolio/` exists from a prior misplaced `Write` call (parent dirs auto-created); it is not a real repo. When asked to work on the brandanthonymcdonald.com codebase, target `bam-landing-page`.

This mistake has been made more than once. If you're about to write a file under `projects/bam-portfolio/` or refer to it as the BAM portfolio repo, stop and re-read this note.

---

## Ecosystem onboarding rule — when adding a NEW product to the WitUS ecosystem

When a new product joins the WitUS ecosystem (a new app, sub-site, or shared infrastructure repo), do these things in order:

1. **Add a CLAUDE.md to the new repo** that opens with the same "Ecosystem repo identity" warning as above (the bam-landing-page / bam-portfolio note). This is a one-paragraph paste; the same text lives in every other ecosystem repo. The note pre-empts a recurring identity mistake — every new repo gets it on day one.
2. **Add the operator-task rule below** to the new repo's CLAUDE.md too — same paragraph as in every other ecosystem repo.
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
