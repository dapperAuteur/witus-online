# WitUS ecosystem brand package

> **Canonical location:** `gemini/witus/public/brand/` — this repo is the single source of truth for ecosystem-wide branding (logos, favicons, footer recipe, partner attribution). Every other ecosystem app references this folder for branding decisions and copies what it needs.
>
> **Stable URL:** `https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/README.md`
>
> **Companion file:** [`footer-recipe.md`](./footer-recipe.md) — the ecosystem footer pattern with Rise Wellness, plus per-app theming guidance.

---

## What lives here

| Path | Purpose |
|---|---|
| [`01-orbit/`](./01-orbit/) | **Variant A — Orbit mark.** Center dot + 8 satellite dots (one per product accent). Tells the ecosystem story literally. |
| [`02-duality/`](./02-duality/) | **Variant B — Duality W.** The W as two halves meeting at a central pillar (Live / Work). Encodes the brand philosophy. |
| [`03-type-dot/`](./03-type-dot/) | **Variant C — Type + dot.** "WitUS" wordmark with a small accent dot trailing the S. Minimal, modern, safe. |
| [`04-orbit-type/`](./04-orbit-type/) | **Variant D — Orbit + type.** Paired wordmark + orbit mark. The most explicit "brand-mark with name" combination. |
| [`README.md`](./README.md) | This file. |
| [`footer-recipe.md`](./footer-recipe.md) | Ecosystem footer pattern (the fly-witus-style three-column footer + Rise Wellness callout). |

Each variant directory contains the same six files:

```
favicon.svg       — vector favicon, square viewBox
favicon-16.png    — 16×16 PNG for legacy browsers
favicon-32.png    — 32×32 PNG
favicon-180.png   — 180×180 apple-touch-icon
logomark.svg      — the mark only (no wordmark)
wordmark.svg      — the mark paired with "WitUS" type
```

All four variants are designed for **dark backgrounds** (logomark fills are `slate-50` / `#f8fafc`). On light surfaces, the mark needs a small dark badge or the variant should be re-coloured. Apps with light themes typically use `02-duality` (the colored bars carry contrast on their own) or `03-type-dot` (re-tinted to `slate-900`).

Live preview of all four variants at `witus.online/brand/logos` — internal review surface, `noindex`'d. That's the route we used to choose between them.

Spec for the original three variants: [`gemini/witus/plans/logo-favicon-preview.md`](../../plans/logo-favicon-preview.md). Variant 4 (`04-orbit-type`) was added later as a paired option.

---

## Picking a variant per app

The four variants are not graded best-to-worst. Each app picks the one that pairs best with its existing palette and visual language. **Different apps can pick different variants.** Suggested pairings live in [`footer-recipe.md`](./footer-recipe.md) under "Per-app theming".

If you don't want to think about it: `04-orbit-type` is the safest universal fallback — most explicit (logo + name in one asset), reads at any scale, doesn't compete with most product brand marks.

---

## How a sibling app uses this package

1. **Decide which variant** the app wants (see [`footer-recipe.md`](./footer-recipe.md) per-app guide).
2. **Copy the assets** into the app's repo. From the sibling repo:
   ```sh
   # Adjust source path to wherever this witus repo is cloned.
   cp -R /path/to/witus/public/brand/02-duality ./public/brand/witus
   ```
   Or fetch the assets via the raw URLs (one per file):
   ```
   https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/02-duality/logomark.svg
   https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/02-duality/wordmark.svg
   https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/02-duality/favicon.svg
   https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/02-duality/favicon-16.png
   https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/02-duality/favicon-32.png
   https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/02-duality/favicon-180.png
   ```
3. **Wire favicons** in your app's `app/layout.tsx` IF this app uses the WitUS umbrella favicon as its primary favicon. Most apps want their **own product favicon** (Fly.WitUS keeps the platypus, FlashLearnAI keeps its own, etc.), and only use the WitUS variant inside the footer. Decide per-app.
4. **Implement the ecosystem footer** by following [`footer-recipe.md`](./footer-recipe.md). The recipe includes a reference TSX (lifted from fly-witus, the reference implementation) plus per-app theming guidance.
5. **Paste the Rise Wellness section verbatim** from the bottom of [`footer-recipe.md`](./footer-recipe.md). The non-affiliation disclaimer is the only piece of the package that **must stay byte-identical** across the ecosystem — don't paraphrase.

---

## Updating the ecosystem brand

When ecosystem branding changes (a new product launches, a partner is added, a variant is retired, the wordmark gets re-cut):

1. **Update this folder first.** This is the canonical home. Update the variant assets, the README, and `footer-recipe.md` (sibling-product list and per-app theming guidance).
2. **Each sibling app then absorbs the change on its next touch** by re-copying assets and re-applying the recipe. Don't try to push edits from the witus repo into 8 sibling repos — they each have their own framework version, palette, and deploy pipeline.
3. **Add a one-line entry to [`gemini/witus/lib/products.ts`](../../lib/products.ts)** (the canonical structured product list) so any structured cross-app reference picks up the change automatically.

The sibling apps each have a CLAUDE.md pointer telling future Claude sessions to read this README before changing branding. That's the awareness mechanism — not import-from-package.

---

## What this package intentionally does NOT include

- **Per-product logos** (Fly.WitUS platypus, CentenarianOS mark, FlashLearnAI brand mark). Those live in each product's own repo.
- **Header / nav components.** Footer-only.
- **OG images / social cards.** Different concern — see [`gemini/witus/plans/08-branded-og-images.md`](../../plans/08-branded-og-images.md) for that work.
- **Bundled JS module.** Each repo has its own framework version; we don't ship transpiled code. Copy-paste pattern matches the witus-outbox `examples/sender.ts` precedent.
- **Legal copy beyond the Rise Wellness non-affiliation disclaimer.** Each app's `/terms` and `/privacy` are its own.

---

## Maintainer notes

- Variants 1–3 authored 2026-04-16. Variant 4 added later. Originals at [`plans/logo-favicon-preview.md`](../../plans/logo-favicon-preview.md).
- Reference footer implementation derived from `claude/fly-witus/src/components/site-footer.tsx` (`feat/track-e-site-footer` branch as of 2026-04-27).
- Rise Wellness copy was vetted with the partner. **Don't alter the disclaimer or paraphrase the services list without re-clearing.**
- This file is in `public/brand/` (not `lib/` or `docs/`) so it's accessible at `witus.online/brand/README.md` and via raw.githubusercontent.com in one canonical location. The `app/brand/` directory next door hosts the live preview route — that's a Next.js page, not a doc.
