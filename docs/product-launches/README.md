# Product Launches

Cross-portfolio source of truth for per-product, per-launch-site copy. WitUS is the ecosystem hub; this is where launch artifacts live so they're reusable across all sub-product repos.

## Coverage matrix

5 Track E launches × multiple launch sites. PH copy is drafted; the rest are scheduled at each app's T-7.

| App | Date | PH | Show HN | Peerlist | IH | Uneed | MicroLaunch | Devhunt | dev.to |
|---|---|---|---|---|---|---|---|---|---|
| **FlashLearnAI** | 2026-05-05 | [draft](product-hunt/flashlearnai.md) | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 |
| **Fly.WitUS** | 2026-05-25 | [draft](product-hunt/fly-witus.md) | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 |
| **WitUS Inbox** | 2026-06-15 | [draft](product-hunt/witus-inbox.md) | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 |
| **CentenarianOS** | 2026-07-06 | [draft](product-hunt/centenarian-os.md) | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 | T-7 |
| **witus.online retro** | 2026-07-27 | [draft](product-hunt/witus-online-retro.md) | T-7 | n/a | T-7 | n/a | n/a | n/a | T-7 |

"T-7" = drafted in the week before launch in a follow-up round. Sister subdirs (`show-hn/`, `peerlist/`, etc.) land at that point.

## What lives here

- **`product-hunt/`** - One file per app. Tagline (60-char max), description (260-char max), first comment (BAM's voice), gallery captions, category picks, maker comment thread starters, cross-links.
- **Future:** `show-hn/`, `peerlist/`, `indie-hackers/`, `uneed/`, `microlaunch/`, `devhunt/` sister dirs at each launch's T-7.

## How to use

**At each launch's T-7:**
1. Read this app's PH file.
2. Verify tagline + description still fit constraints (PH may change limits; re-count).
3. Substitute the Switchy short URL for the slug placeholder.
4. Paste tagline + description + first comment into PH's editor on launch eve.
5. At the locked launch-day timeline (PH 03:01 PT for the Track E sequence), publish.

**Switchy slug namespace** (locked in commercial playbook §3):
- FlashLearnAI: `e-flash-ph`, `e-flash-hn`, `e-flash-pl`, `e-flash-gh`, `e-flash-api`
- Fly.WitUS: `e-fly-ph`
- WitUS Inbox: `e-inbox-ph`, `e-inbox-hn`, `e-inbox-gh`
- CentenarianOS: `e-cent-ph`, `e-cent-hn`
- witus.online retro: `e-witus-hn`

## Related

- **Master launch playbook:** [`../../plans/social-media/2026-04-27-track-e-builder-distribution.md`](../../plans/social-media/2026-04-27-track-e-builder-distribution.md) - channels, cadence, locked launch order, per-launch checklist.
- **Commercial playbook (consolidated):** [`../../plans/playbook/2026-04-27-witus-commercial-playbook.md`](../../plans/playbook/2026-04-27-witus-commercial-playbook.md) §3 - Track E scope + Switchy namespace.
- **Per-product launch-prep docs** (in each sub-product repo):
 - `claude/flashlearn-ai/plans/2026-04-27-track-e-launch-prep.md`
 - `claude/fly-witus/plans/2026-04-27-track-e-launch-prep.md`
 - `claude/witus-inbox/plans/2026-04-27-track-e-launch-prep.md`
 - `gemini/centenarian-os/plans/40-2026-04-27-track-e-launch-prep.md`
 - `gemini/witus/docs/2026-04-27-track-e-launch-prep.md`
- **HARO source tracking:** [`../haro/`](../haro/) - expert quotes for press releases (which feed launch-day social proof + pull-quotes).
