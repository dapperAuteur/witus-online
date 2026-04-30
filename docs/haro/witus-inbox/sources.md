# HARO sources - WitUS Inbox

**App:** Open-source signed-webhook receiver, canonical-record store, and triage UI behind a 9-product solo-built ecosystem. MIT-licensed at launch (gated on 2026-06-08 OSS-ready hard deadline).

**Press releases benefiting from quotes:** None yet (WitUS Inbox launches 2026-06-15; press releases drafted post-launch).

**Campaign tag:** `witusinbox-press-2026-06`

**Default Media Outlet:**
- Media Outlet Name: BAM Blog at brandanthonymcdonald.com
- Media Outlet Website: https://brandanthonymcdonald.com

## Active queries

| # | Posted? | Deadline | Status |
|---|---|---|---|
| Q1 | No | Post around 2026-06-02 | Draft below |
| Q2 | No | Post around 2026-06-09 | Draft below |

---

### Q1 - OSS maintainers + platform engineers on signed-webhook contracts

**Releases this lands in:** post-launch WitUS Inbox press release (TBD).

- **Summary (75 char max):** OSS maintainers on HMAC-signed webhook contracts + replay protection (73)
- **Category:** Computers and Technology
- **Deadline:** ~72 hours after posting
- **Query body (2500 char max):**

> Looking for OSS maintainers, platform engineers, or webhook-product engineers (Stripe, GitHub, Mailgun, etc.) with named credentials at a tech company or OSS project. Topic: signed-webhook contract design - HMAC algorithm choice, replay-window, header conventions, key rotation strategy.
>
> Specifically interested in: the most common signing-scheme failures you've seen in the wild; whether SHA-256 HMAC with a 5-minute replay window is overkill, underkill, or right-sized for a small-operator multi-product ecosystem; how to structure key rotation so producers and consumers don't drift; and the most useful pieces of the Stripe / GitHub webhook-signing patterns for someone building one from scratch.
>
> Looking for 1-2 sentence quotes attributable by name + role + project or company. For a forthcoming Show HN + press release post on an open-source signed-webhook receiver. Tag your reply subject line `witusinbox-press-2026-06`.

---

### Q2 - Postgres schema designers on multi-tenant vs single-operator data models

**Releases this lands in:** post-launch WitUS Inbox press release (TBD).

- **Summary (75 char max):** Postgres designers on single-operator vs multi-tenant schema choices (74)
- **Category:** Computers and Technology
- **Deadline:** ~72 hours after posting
- **Query body (2500 char max):**

> Looking for Postgres-focused database engineers, application architects, or platform engineers with named credentials at a tech company or consultancy. Topic: when "single-operator self-hostable" is the right schema decision vs when an OSS project should bake in multi-tenancy from day one.
>
> Specifically interested in: the data-model differences between single-operator and multi-tenant for a webhook-receiver product (RLS? row-level tenant_id? schema-per-tenant?); the threat-model differences; and how you'd communicate to potential adopters that the OSS version is single-operator on purpose without alienating the multi-tenant audience.
>
> Looking for 1-2 sentence quotes attributable by name + role + company. For a forthcoming press release on a single-operator-by-design OSS webhook receiver. Tag your reply subject line `witusinbox-press-2026-06`.

---

## Sources received

(No sources logged yet.)

## Outreach log

| Date | Source | Action | Outcome |
|---|---|---|---|
| (none yet) | | | |

## Quote-collection rules

Same as `flashlearnai/sources.md`.
