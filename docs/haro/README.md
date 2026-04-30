# HARO Source Tracking

Cross-portfolio source-of-truth for HARO query drafts and the named experts whose quotes land in WitUS press releases.

**Path A** (per `claude/flashlearn-ai/plans/user-tasks/00-bam-action-items.md` Task 6): BAM is registered as a journalist/source-seeker on helpareporter.com. Each query in this dir is BAM-as-journalist asking subject-matter experts for 1-2 sentence quotes that land in a forthcoming press release.

**Reference doc:** [`Help a Reporter Out (HARO) – Connecting Journalists & Sources.pdf`](Help%20a%20Reporter%20Out%20%28HARO%29%20%E2%80%93%20Connecting%20Journalists%20%26%20Sources.pdf) - the actual HARO submission form fields and limits.

## Coverage matrix

| App | Queries drafted | First post target | Status |
|---|---|---|---|
| **FlashLearnAI** | [6 (sources.md)](flashlearnai/sources.md) | Wave 3 send window, ~2026-05-19 | Drafts ready, none posted |
| **Wanderlearn** | [2 (sources.md)](wanderlearn/sources.md) | Coordinated with FL Wave 1 partnership send | Drafts ready, none posted |
| **CentenarianOS** | [2 (sources.md)](centenarian-os/sources.md) | ~2026-06-22 (4 weeks before launch) | Drafts ready, none posted |
| **Fly.WitUS** | [1 (sources.md)](fly-witus/sources.md) | ~2026-05-12 (2 weeks before launch) | Drafts ready, none posted |
| **WitUS Inbox** | [2 (sources.md)](witus-inbox/sources.md) | ~2026-06-02 + ~2026-06-09 | Drafts ready, none posted |
| **witus.online** | [1 (sources.md)](witus-online/sources.md) | ~2026-07-13 (2 weeks before retro) | Drafts ready, none posted |

**Total:** 14 query drafts across 6 apps.

## How to use

**To post a query:**
1. Open the per-app `sources.md`.
2. Pick the next query (e.g. FL Q1).
3. Copy Summary + Query body + Category from the doc.
4. Go to [helpareporter.com/submit-query](https://www.helpareporter.com/submit-query).
5. Paste each field. Set Deadline ~72 hours out in `America/Indianapolis`.
6. Submit. Mark `Posted? = Yes` and `Deadline` filled in the per-app table.

**To process a response:**
1. Verify the source's affiliation (LinkedIn, university page, public credential).
2. Email the source confirming consent for first-person attribution by name + institution. Save the consent reply.
3. If the quote is strong: log a source block in the per-app `sources.md` under "Sources received".
4. When the quote is integrated into a press release file, mark the source `Status: Integrated`.
5. Reply to the source after the release ships, with a link.

## Form-field cheat sheet (also in per-app docs)

Per [`Help a Reporter Out (HARO) – Connecting Journalists & Sources.pdf`](Help%20a%20Reporter%20Out%20%28HARO%29%20%E2%80%93%20Connecting%20Journalists%20%26%20Sources.pdf), the submission form requires:

| Field | Limit | What it is |
|---|---|---|
| Summary | 75 chars | Listing headline shown to potential sources |
| Query | 2500 chars | The full body of what BAM is asking for |
| Media Outlet Name | (free-text) | "BAM Blog at brandanthonymcdonald.com" by default |
| Media Outlet Website | (URL) | `https://brandanthonymcdonald.com` by default |
| Category | dropdown | Per-query suggestion in each draft |
| Deadline for Experts | datetime | TZ America/Indianapolis; ~72 hours after posting |
| First/Last Name + Email + Phone | (form fields) | BAM's standard contact details |

## Default attribution boilerplate

Every query body ends with the same line: a request that responding sources tag their reply subject line with the campaign tag (per-app: `flashlearnai-press-2026-04`, `wanderlearn-press-2026-04`, etc.) so BAM's inbox filter can route them to the right per-app folder.

## Quote-collection rules (canonical)

1. Verify affiliation before considering the quote.
2. Get consent for first-person attribution in writing.
3. Strong quotes only. Skip generic platitudes.
4. Drop into the relevant press release as a callout block under the founder quote.
5. Wave 1 (developer/edtech press) doesn't need HARO quotes to ship. Waves 3-5 (audience-specific releases) benefit most.

## Related

- **Canonical workflow:** [`claude/flashlearn-ai/plans/user-tasks/00-bam-action-items.md`](../../../../claude/flashlearn-ai/plans/user-tasks/00-bam-action-items.md) Task 6
- **Press releases dir:** [`claude/flashlearn-ai/press/`](../../../../claude/flashlearn-ai/press/) - where quotes land
- **Distribution playbook:** [`claude/flashlearn-ai/press/distribution-playbook.md`](../../../../claude/flashlearn-ai/press/distribution-playbook.md) - release send order
- **Master launch-submission-prep doc:** [`../launch-submission-prep.md`](../launch-submission-prep.md) - the per-product Claude session reference covering both PH and HARO submission specs
- **Product launch copy:** [`../product-launches/`](../product-launches/) - companion artifact for PH/Show HN/etc.
