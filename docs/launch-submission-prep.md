# Master Launch Submission Prep - Product Hunt + HARO

**Audience:** Each sub-product's Claude Code VS Code session.
**Purpose:** Drop this doc into a sub-product repo's context (along with that product's `*-track-e-launch-prep.md`) and ask Claude to draft the Product Hunt and HARO submissions for that product. Output is paste-ready: BAM opens the resulting files, copies fields into PH and HARO submit forms, pastes, ships.

---

## How a sub-product session uses this

If you (the Claude session) are working in a sub-product repo (e.g. `claude/fly-witus`, `gemini/centenarian-os`):

1. **Read** the per-product launch-prep doc in your repo's `plans/` (e.g. `plans/2026-04-27-track-e-launch-prep.md` or `plans/40-2026-04-27-track-e-launch-prep.md`). It has the launch date, product positioning, audience hooks, and the "out of scope" rules for that launch.
2. **Read** this doc end-to-end so you understand the form fields and limits both PH and HARO impose.
3. **Draft** two files in the witus repo (BAM merges):
  - `gemini/witus/docs/product-launches/product-hunt/{product-slug}.md` - PH copy
  - `gemini/witus/docs/haro/{product-slug}/sources.md` - HARO query drafts
4. **Reference** the existing FlashLearnAI files as worked examples:
  - PH: `gemini/witus/docs/product-launches/product-hunt/flashlearnai.md`
  - HARO: `gemini/witus/docs/haro/flashlearnai/sources.md`
5. **Output rule:** BAM should be able to open your files, copy each labeled field, paste into the respective submission form, and ship without rewriting anything. If BAM has to edit your output, the draft wasn't done.

---

## Part 1 - Product Hunt submission

### Form fields PH asks for

| Field | Limit | Notes |
|---|---|---|
| Tagline | 60 chars | Punchy, concrete, leads with the differentiator. No marketing fluff. |
| Description | 260 chars | 2-3 sentences. What + for whom + differentiator. |
| First comment | (no hard limit, but ~150 words is the read window) | The maker's first comment under the launch. Personal voice. |
| Gallery images | 4-6 PNG/JPG | Captions ≤ 60 chars each. Image production is BAM's design call; you draft captions only. |
| Topics / categories | up to 4 | Pick from PH's category taxonomy (Education, Productivity, Developer Tools, AI, Health & Fitness, etc.). |
| Maker comment thread starters | (no limit) | Short pre-baked replies to common comment patterns. Saves BAM from typing the same answer 5 times on launch day. |
| Cross-links | (substituted at send time) | App URL, pricing URL, docs URL, GitHub if public, Switchy short URL from the locked namespace. |

### Constraints

- **No em dashes.** Use commas, periods, or rephrase. Em dashes are an AI-writing tell.
- **No AI stock vocabulary.** Banned words: robust, delve, leverage, comprehensive, seamless, journey, harness, embark, navigate, foster, empower, unleash, unlock, intricacies, paramount, pivotal, realm, landscape, synergy, holistic, cutting-edge, state-of-the-art.
- **First-person voice in the first comment.** BAM's voice. Personal hook first (often the centenarian-athlete framing), then product, then CTA.
- **No corporate "we"** in the first comment. Use "I".
- **Hooks must be supportable** by the per-product launch-prep doc. Don't claim a feature that isn't in the doc.

### Switchy slug namespace (locked, from the commercial playbook §3)

| Product | PH slug | Other locked slugs |
|---|---|---|
| FlashLearnAI | `e-flash-ph` | `e-flash-hn`, `e-flash-pl`, `e-flash-gh`, `e-flash-api` |
| Fly.WitUS | `e-fly-ph` | (additional slugs TBD per launch-prep) |
| WitUS Inbox | `e-inbox-ph` | `e-inbox-hn`, `e-inbox-gh` |
| CentenarianOS | `e-cent-ph` | `e-cent-hn` |
| witus.online retro | (PH may be skipped) | `e-witus-hn` |

**For new products** (post-Track-E): match the pattern `e-{short-product-name}-{site}`. Add to the commercial playbook §3 namespace before drafting.

### PH file template

Drop this into `gemini/witus/docs/product-launches/product-hunt/{product-slug}.md`:

```markdown
# Product Hunt launch - {Product name}

**Launch date:** {YYYY-MM-DD} (Track E launch #N or "post-Track-E")
**Switchy slug:** `e-{short}-ph`
**Hunter:** TBD by BAM
**Status:** Draft / Scheduled / Live / Archived

## Tagline (60-char max)

**Primary:** {one tight line, leads with the differentiator} ({char count})

**Alternatives:**
- {alt 1} ({count})
- {alt 2} ({count})

## Launch description (260-char limit)

{2-3 sentences. What + for whom + differentiator + optional PH-crowd angle.} ({char count})

## First comment (BAM's voice)

{Personal hook paragraph leading with why BAM built this. Often the centenarian-athlete framing or a specific pain that triggered the build.}

{Feature paragraph: 1-2 things the user will actually use day-to-day. Concrete, not feature-listy.}

{Optional dev-crowd paragraph: API, OSS, architecture detail, etc.}

{CTA paragraph: link + AMA invitation.}

## Gallery captions (4-6 images, 60 chars each)

1. {Hero shot caption} ({count})
2. {Key feature caption} ({count})
3. {Differentiator caption} ({count})
4. {Pricing or social proof caption} ({count})
5. {CTA / closer caption} ({count})

## Topics / categories

- {Primary category}
- {Secondary categories}

## Maker comment thread starters

**"{Common question 1}"**
> {2-3 sentence honest answer in BAM's voice}

**"{Common question 2}"**
> {Answer}

**"{Common question 3}"**
> {Answer}

## Cross-links (substituted at send time)

- App: {URL}
- Pricing: {URL}
- Docs: {URL}
- GitHub: {URL or TBD}
- Switchy short URL: filled in from `e-{short}-ph` slug at T-7

## References

- Per-product launch-prep doc: `{path/to/plans/...-track-e-launch-prep.md}`
- {Any product-specific notes the launch-prep doc flagged}
```

### Drafting checklist (sub-product Claude session, before reporting done)

- [ ] Tagline ≤ 60 chars (count to confirm).
- [ ] Description ≤ 260 chars (count to confirm).
- [ ] First comment leads with personal hook, not feature pitch.
- [ ] No em dashes anywhere in the file.
- [ ] No banned AI-stock vocabulary.
- [ ] Switchy slug pulled from locked namespace (or new slug added to commercial playbook §3 first).
- [ ] All hooks traceable to the per-product launch-prep doc.
- [ ] Cross-links match the live URL pattern for the product's domain.
- [ ] At least 3 maker comment thread starters covering the most likely PH comments.

---

## Part 2 - HARO submission (BAM as journalist seeking sources)

### Form fields HARO asks for

Per [`gemini/witus/docs/haro/Help a Reporter Out (HARO) – Connecting Journalists & Sources.pdf`](haro/Help%20a%20Reporter%20Out%20%28HARO%29%20%E2%80%93%20Connecting%20Journalists%20%26%20Sources.pdf), the [submit-query](https://www.helpareporter.com/submit-query) form requires:

| Field | Limit | Notes |
|---|---|---|
| Summary | 75 chars | The query's listing headline. Sources scan summaries to decide whether to read more. |
| Query | 2500 chars | The full ask. What BAM wants, who from, what to include in the response, any deadline-shaped urgency. |
| Media Outlet Name | (free-text) | Default: `BAM Blog at brandanthonymcdonald.com`. Per-query override OK if a specific WitUS site is the better fit. |
| Media Outlet Website | (URL) | Default: `https://brandanthonymcdonald.com`. |
| Category | dropdown | Pick the closest fit from HARO's taxonomy (Education, Health and Medicine, Business and Finance, Computers and Technology, Travel, Lifestyle and Fitness, Public Policy and Government, etc.). |
| Deadline for Experts | datetime | Timezone `America/Indianapolis`. ~72 hours after posting per user-tasks Task 6 guidance. |
| First Name / Last Name / Email / Phone | (BAM's contact info) | Standard. |

### HARO file template

Drop this into `gemini/witus/docs/haro/{product-slug}/sources.md`:

```markdown
# HARO sources - {Product name}

**App:** {one-line description}

**Press releases benefiting from quotes:**
- [`{release-filename}`]({relative-path}/press/{release-filename}.md)
- ...

**Campaign tag (in subject line of every response):** `{product-slug}-press-{YYYY-MM}`

**Default Media Outlet:**
- Media Outlet Name: BAM Blog at brandanthonymcdonald.com
- Media Outlet Website: https://brandanthonymcdonald.com

## Active queries

| # | Posted? | Deadline | Status |
|---|---|---|---|
| Q1 | No | {target post date} | Draft below |
| Q2 | No | {target post date} | Draft below |

---

### Q1 - {short query topic, e.g. "Memory researchers on spaced repetition"}

**Releases this lands in:** {filename(s)}

- **Summary (75 char max):** {paste-ready summary} ({count})
- **Category:** {HARO category}
- **Deadline:** ~72 hours after posting
- **Query body (2500 char max):**

> {Full paste-ready query body. Lead paragraph: who you're looking for + topic. Middle paragraph: specifically interested in (3-5 sub-questions). Closing paragraph: what attribution you need + the campaign tag.}

---

(Repeat per query.)

---

## Sources received

(Empty until first responses arrive. Template:)

```
### {Source full name}, {Credential}, {Institution}
**Found via:** Q{N} | direct outreach | referral
**Affiliation verified:** Y/N (link)
**Contacted:** {YYYY-MM-DD}
**Consent for first-person attribution:** Y/N (link to consent reply)
**Quote text:**
> "..."
**Lands in:** [release filename]
**Status:** Pending / Verified / Quote received / Integrated / Declined
```

## Outreach log

| Date | Source | Action | Outcome |
|---|---|---|---|

## Quote-collection rules

(Same checklist as `flashlearnai/sources.md`.)
```

### Drafting checklist (sub-product Claude session, before reporting done)

- [ ] Each query Summary ≤ 75 chars (count to confirm).
- [ ] Each query body ≤ 2500 chars.
- [ ] Each query body ends with the campaign-tag instruction so BAM's inbox can route responses.
- [ ] Categories picked from HARO's actual taxonomy.
- [ ] Default Media Outlet matches the canonical default (or per-query override is justified).
- [ ] Target post date scheduled relative to the launch (~2-3 weeks out is typical).
- [ ] No em dashes, no banned vocabulary.
- [ ] Press release pointers reference real filenames (no broken links).

---

## Part 3 - Worked examples in this repo

These already-shipped FlashLearnAI files are the canonical reference. When in doubt, mirror their structure:

- **Product Hunt:** [`product-launches/product-hunt/flashlearnai.md`](product-launches/product-hunt/flashlearnai.md)
- **HARO:** [`haro/flashlearnai/sources.md`](haro/flashlearnai/sources.md)

## Part 4 - When sub-product Claude is done

1. Branch the **witus repo** (not the sub-product repo) - both files land in witus, not the source repo.
2. Branch name suggestion: `docs/{product-slug}-launch-submission-drafts`.
3. Push the branch. BAM merges.
4. In your final report-back to BAM, paste:
  - The PH tagline (so BAM can sanity-check at a glance)
  - The PH description's char count
  - The number of HARO queries drafted
  - The path to the two new files

Per BAM's standing rule (from his memory): **branch first, push when complete, never merge into main.**

---

## Related

- **Master launch playbook (witus, all 5 Track E launches):** [`../plans/social-media/2026-04-27-track-e-builder-distribution.md`](../plans/social-media/2026-04-27-track-e-builder-distribution.md)
- **Commercial playbook (consolidated):** [`../plans/playbook/2026-04-27-witus-commercial-playbook.md`](../plans/playbook/2026-04-27-witus-commercial-playbook.md)
- **Product Launch copy dir (PH + future Show HN/Peerlist/etc.):** [`product-launches/`](product-launches/)
- **HARO source-tracking dir:** [`haro/`](haro/)
- **HARO PDF reference (form-field source of truth):** [`haro/Help a Reporter Out (HARO) – Connecting Journalists & Sources.pdf`](haro/Help%20a%20Reporter%20Out%20%28HARO%29%20%E2%80%93%20Connecting%20Journalists%20%26%20Sources.pdf)
- **HARO query workflow:** [`../../../claude/flashlearn-ai/plans/user-tasks/00-bam-action-items.md`](../../../claude/flashlearn-ai/plans/user-tasks/00-bam-action-items.md) Task 6
