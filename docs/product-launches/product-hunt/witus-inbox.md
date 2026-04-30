# Product Hunt launch - WitUS Inbox (OSS)

**Launch date:** 2026-06-15 (Track E launch #3, highest-signal Show HN candidate)
**Switchy slug:** `e-inbox-ph`
**Hunter:** TBD by BAM
**Status:** Draft (gated on OSS-ready hard deadline 2026-06-08)

## Tagline (60-char max)

**Primary:** Open-source signed-webhook inbox for solo operators (55)

**Alternatives:**
- One inbox, signed webhooks, 8 products. Now OSS. (49)
- The webhook receiver behind a 9-product solo ecosystem (55)

## Launch description (260-char limit)

WitUS Inbox is the open-source signed-webhook receiver, canonical-record store, and triage UI behind a 9-product ecosystem. Self-host on Vercel + Postgres. Documented webhook contract. MIT licensed. Built by one operator who got tired of nine inboxes. (251)

## First comment (BAM's voice)

I built nine products and started getting submissions in nine different places. Form responses in one mailbox, partner pings in another, signup webhooks scattered. Triage was a part-time job I didn't have.

So I built one inbox and pointed every product at it. Each product signs its own webhooks (HMAC + replay-window) and the inbox normalizes them into one Postgres schema. Submissions come in, get tagged, get acted on. Hot leads SMS me. Everything else queues up for the next triage pass.

Today I'm open-sourcing the whole thing. The webhook contract, the triage UI, the example sender library, the Vercel + Neon deploy guide. If you run more than one product on your own, this is the receiver I wish I'd had two years ago.

Repo + deploy guide at the link. AMA on the contract design or the multi-tenant question (answer: it's single-operator self-hostable on purpose, multi-tenant is a different product).

## Gallery captions (4-6 images, 60 chars each)

1. One inbox, 9 products. Signed webhooks. MIT license. (53)
2. HMAC signing + replay-window. Documented contract. (51)
3. Triage UI: tag, route, mark hot, archive. (42)
4. SMS alerts for hot-priority leads via Mobile Text Alerts. (57)
5. One-click Vercel + Neon Postgres deploy. (40)
6. Example sender library. 50 lines. Drop in. (42)

## Topics / categories

- Developer Tools (primary)
- Open Source
- Productivity

## Maker comment thread starters

**"Why not just use Tally + Airtable / Formspree / Zapier?"**
> Those work great until you have multiple products and want one canonical record store. Tally + Airtable is per-form. Formspree is per-form. Zapier is per-flow. Inbox is per-operator: every product writes to it; one place handles triage, alerting, and replay.

**"Why open source it?"**
> Two reasons. First, the receiver is the kind of thing every multi-product solo operator builds and rebuilds, badly. Second, the signed-webhook contract benefits from public review. If the signing scheme has a hole I'd rather hear it on a public issue than in a breach.

**"Multi-tenant?"**
> No, by design. The launch is single-operator self-hosted. Multi-tenant changes the threat model and the contract. If there's demand I'd build a separate hosted product, but the OSS version stays focused.

## Cross-links (substituted at send time)

- Repo: https://github.com/dapperAuteur/witus-inbox
- Live demo: https://inbox.witus.online (or a sandbox URL)
- Webhook contract spec: `docs/webhook-contract.md` in the repo
- Quick-start: `docs/deploy-vercel-neon.md` in the repo
- Switchy short URL: filled in from `e-inbox-ph` slug at T-7

## Fallback if OSS sanitization slips past 2026-06-08

Per the launch-prep doc, if the repo isn't OSS-ready by Jun 8, the launch goes closed-source on the same day. PH copy adjustment in that case:

- Tagline: drop "Open-source", lead with "Signed-webhook inbox behind a 9-product solo ecosystem"
- Description: drop "MIT licensed" + "Self-host"; replace with "The contract spec is public; the runtime is closed-source for now"
- First comment: drop the "today I'm open-sourcing" paragraph; pivot to "the architecture diagram + webhook contract are the share-able artifacts"

## References

- Per-product launch-prep doc: `claude/witus-inbox/plans/2026-04-27-track-e-launch-prep.md`
- OSS-ready hard deadline: 2026-06-08 (canonical plan §6)
- Show HN is the highest-signal channel for this launch; PH is still hit but OSS angle plays harder on HN
