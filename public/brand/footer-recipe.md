# Ecosystem footer recipe

> **Stable URL:** `https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/footer-recipe.md`
> **Companion:** [`README.md`](./README.md) — variant index + how-to-copy-assets.

The shared ecosystem footer is the same **structure** in every app and a different **palette** in each. Reference implementation lives in `claude/fly-witus/src/components/site-footer.tsx`. The fly-witus version is BAM's preferred reference because the layout, accessibility shape, and Rise Wellness placement are correct — but the colors are fly-witus's (sky / lime / fuchsia on white), not yours.

**Match the styling of the app you're in. Don't copy fly-witus's palette.**

---

## Anatomy of the footer

```
┌──────────────────────────────────────────────────┐
│  [optional product logo + name + 1-line summary] │  ← per-app branding
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐    │
│  │  Rise Wellness callout                    │    │  ← canonical, verbatim
│  │  (mental-health partner, with disclaimer) │    │     across all apps
│  └──────────────────────────────────────────┘    │
├──────────────────────────────────────────────────┤
│  Ecosystem      │  This app    │  Partners &    │  ← three-column nav
│  • WitUS.online │  • Pricing   │    Legal        │
│  • CentOS       │  • Roadmap   │  • Rise Wellness│
│  • Work.WitUS   │  • Sign in   │  • Terms        │
│  • …            │              │  • Privacy      │
│                 │              │  • Contact      │
├──────────────────────────────────────────────────┤
│  © {year} B4C LLC — A AwesomeWebStore.com brand  │
└──────────────────────────────────────────────────┘
```

Three semantic regions: a small product header (optional), the Rise Wellness callout, the three-column nav, the copyright line. Mobile collapses to a single column. Focus visible on every link.

The Rise Wellness callout sits **above** the three-column grid, not buried inside Partners & Legal, because mental-health resources warrant prominence.

---

## Reference TSX

Adapted from `claude/fly-witus/src/components/site-footer.tsx`. Theme tokens are marked `[swap]` — those are the only values to change per app. Don't change the layout, the link order, the disclaimer text, or the accessibility shape.

```tsx
import Image from "next/image";
import Link from "next/link";

interface SiblingProduct {
  name: string;
  href: string;
}

// Canonical sibling-product list. Mirror with gemini/witus/lib/products.ts.
// When the ecosystem changes, update here AND in lib/products.ts AND in
// every sibling repo's footer (yes — copy-paste cost).
const SIBLING_PRODUCTS: SiblingProduct[] = [
  { name: "WitUS.online", href: "https://witus.online" },
  { name: "WitUS Inbox", href: "https://inbox.witus.online" },
  { name: "CentenarianOS", href: "https://centenarianos.com" },
  { name: "Work.WitUS", href: "https://work.witus.online" },
  { name: "Tour Manager OS", href: "https://tour.witus.online" },
  { name: "Wanderlearn", href: "https://wanderlearn.witus.online" },
  { name: "Fly.WitUS", href: "https://fly.witus.online" },
  { name: "FlashLearnAI", href: "https://flashlearnai.witus.online" },
  { name: "Learn.WitUS", href: "https://centenarianos.com/academy" },
  { name: "AwesomeWebStore", href: "https://awesomewebstore.com" },
];

// [swap] — the only block that changes per app.
const linkClasses =
  "inline-flex items-center min-h-7 text-gray-600 hover:text-sky-700 hover:underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    // [swap] — outer surface tokens (bg, border)
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Optional per-app logo + name + tagline. Skip the Image if your
            app uses its own product mark instead of a WitUS variant here. */}
        <div className="flex flex-col items-center text-center mb-8">
          <Image
            src="/brand/witus/logomark.svg"  /* or your product logo */
            alt="WitUS"                      /* or your product name */
            width={56}
            height={56}
            className="h-12 w-auto mb-2"
          />
          {/* [swap] — heading color */}
          <p className="font-extrabold text-gray-900">YOUR PRODUCT NAME</p>
          {/* [swap] — muted text */}
          <p className="text-xs text-gray-500">One-line summary</p>
        </div>

        <RiseWellnessCallout />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          <div>
            {/* [swap] — column heading color */}
            <p className="text-gray-900 font-semibold mb-2">Ecosystem</p>
            <ul className="space-y-1">
              {SIBLING_PRODUCTS.map((p) => (
                <li key={p.href}>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    {p.name}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-gray-900 font-semibold mb-2">Your App</p>
            <ul className="space-y-1">
              <li><Link href="/" className={linkClasses}>Home</Link></li>
              <li><Link href="/pricing" className={linkClasses}>Pricing</Link></li>
              <li><Link href="/roadmap" className={linkClasses}>Roadmap</Link></li>
              <li><Link href="/login" className={linkClasses}>Sign in</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-gray-900 font-semibold mb-2">Partners &amp; Legal</p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://www.centenarianos.com/safety#rise-wellness"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  Rise Wellness
                  <span className="sr-only"> (mental-health partner — opens in new tab)</span>
                </a>
                {/* [swap] — muted text */}
                <p className="text-xs text-gray-400 leading-tight">Mental-health partner</p>
              </li>
              <li className="pt-2">
                <a href="https://witus.online/terms" target="_blank" rel="noopener noreferrer" className={linkClasses}>Terms</a>
              </li>
              <li>
                <a href="https://witus.online/privacy" target="_blank" rel="noopener noreferrer" className={linkClasses}>Privacy</a>
              </li>
              <li>
                <a href="mailto:bam@awews.com" className={linkClasses}>Contact</a>
              </li>
            </ul>
          </div>
        </div>

        {/* [swap] — divider + copyright muted text */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500 text-center">
          <p>
            © {year} B4C LLC — A{" "}
            <a
              href="https://awesomewebstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-sky-700 hover:underline"
            >
              AwesomeWebStore.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>{" "}
            brand
          </p>
        </div>
      </div>
    </footer>
  );
}

// See the Rise Wellness section below — copy verbatim. The disclaimer
// sentence is non-negotiable (vetted with the partner).
function RiseWellnessCallout() {
  return (
    <section
      aria-labelledby="rise-wellness-heading"
      // [swap] — card surface (subtle tint matching app accent)
      className="mb-8 rounded-lg border border-sky-100 bg-sky-50/60 p-5 text-sm"
    >
      {/* See full markup in fly-witus footer or in this file's
          "Rise Wellness — canonical copy" section below. */}
      {/* ... */}
    </section>
  );
}
```

Full Rise Wellness markup is in the canonical-copy section at the bottom of this file.

---

## Per-app theming

For each app: existing palette · suggested logo variant · the swap pattern · which file to touch. The "swap pattern" replaces the `sky-*` tokens in the reference TSX with the app's primary accent.

### CentenarianOS — `centenarianos.com`

- **Palette:** sky for actions, fuchsia for branding. Light theme (`bg-gray-50`, `bg-white`).
- **Logo variant:** `01-orbit` (orbit reads cleanly against fuchsia) or `03-type-dot` (minimal).
- **Swap:** `sky-*` accents already match. Optionally add `fuchsia-*` on the column-heading line for CentOS branding within the footer.
- **Existing footer:** [`gemini/centenarian-os/components/ui/SiteFooter.tsx`](../../../centenarian-os/components/ui/SiteFooter.tsx) is the **minimal** version (no Rise Wellness callout — just a `/safety#rise-wellness` link). Replace it; CentOS now hosts the Rise Wellness page itself, so the callout here can be a shorter "see /safety for full details" pointer rather than the full callout.

### Work.WitUS — `work.witus.online`

- **Palette:** amber accents. Dashboard light (`slate-50`/`white`), login dark (`neutral-950`/`900`).
- **Logo variant:** `02-duality` (the W's right diagonal is already amber-500) or `04-orbit-type` for amber in both ring and wordmark.
- **Swap:** replace `sky-*` with `amber-*`. `amber-600` for hover/focus, `amber-100/50` for the Rise Wellness card background. Use light variant of the swap on dashboard pages, dark variant on login pages.
- **Existing footer:** none currently. New add.

### FlashLearnAI — `flashlearnai.witus.online`

- **Palette:** check repo — likely violet/indigo for brand. Light + dark.
- **Logo variant:** `03-type-dot` (won't compete with FlashLearnAI's own wordmark).
- **Swap:** `sky-*` → app primary action color.
- **White-label note:** FlashLearnAI has a white-label app variant. When the footer ships in a white-label client, **strip the Rise Wellness callout** (it's a WitUS brand mention) and remove the WitUS attribution from the copyright line. Keep the layout otherwise.

### Fly.WitUS — `fly.witus.online`

- **Status:** **Reference implementation.** [`claude/fly-witus/src/components/site-footer.tsx`](../../../fly-witus/src/components/site-footer.tsx). Currently uses `flywitus-platypus-logo.png` instead of a WitUS variant — keep the platypus.
- **Action:** optional small `04-orbit-type` wordmark at the very bottom — "Part of the WitUS ecosystem · [logo]" — to tie back to the umbrella brand. Otherwise this footer is canonical and doesn't need to change.

### Wanderlearn — `wanderlearn.witus.online`

- **Palette:** check repo (earthy / travel-themed).
- **Logo variant:** `01-orbit` (8 product accents echo place-based course library) or `02-duality`.
- **Swap:** muted Rise Wellness card tone (don't compete with Wanderlearn's photography hero treatment).
- **Existing footer:** none currently.

### Tour Manager OS — `tour.witus.online`

- **Palette:** check repo. WCAG 2.1 AA contrast is a hard rule for this product.
- **Logo variant:** `02-duality` (cleanest silhouette, reads strong on any background).
- **Swap:** verify color contrast at every swap. WCAG AA applies to the footer too.

### WitUS Inbox — `inbox.witus.online`

- **Palette:** violet on slate. Light + dark.
- **Logo variant:** `04-orbit-type` (orbit pairs visually with the bus / receiver concept).
- **Existing footer:** [`claude/witus-inbox/components/SiteFooter.tsx`](../../../witus-inbox/components/SiteFooter.tsx) — already implements the recipe minus the logo at top. Add the variant; minor swap otherwise.

### bam-landing-page — `brandanthonymcdonald.com`

- **Status:** BAM's personal site, not a WitUS product. Footer should mention BAM is the operator of the WitUS ecosystem without making the personal site look like a WitUS subsite.
- **Logo variant:** `03-type-dot` (won't compete with BAM's personal wordmark).
- **Action:** one sentence + the variant + ecosystem links. Don't reproduce the full three-column footer here — reduce to a single line ("WitUS ecosystem operator · [logo]") plus links.

### witus.online — `witus.online`

- **Status:** the parent brand site. **Renders the Rise Wellness callout** above its existing footer grid (policy updated 2026-05-13 — mental-health resource visibility takes precedence over the earlier "parent brand doesn't repeat ecosystem links" carve-out). The full ecosystem footer is NOT used here — only the Rise Wellness callout is inlined above the apex site's custom 4-column footer.
- **Palette:** dark theme (`bg-slate-950` body), teal accent (`border-teal-500/30 bg-teal-500/5` for the callout container).
- **Logo variant:** N/A — apex site has its own wordmark in the header; footer brand attribution is "A B4C LLC / AwesomeWebStore.com brand" text only.
- **Existing footer:** [`gemini/witus/components/Footer.tsx`](../../components/Footer.tsx) — Rise Wellness callout added 2026-05-13. App-name token in the disclaimer is "WitUS" (not "WitUS.online" or other variants).

---

## Rise Wellness — canonical copy

**Paste verbatim.** Don't paraphrase the services list. The non-affiliation disclaimer is the only piece of the entire package that **must stay byte-identical** across the ecosystem (vetted with the partner).

The container className is the only swap target. Everything inside the section stays.

```tsx
<section
  aria-labelledby="rise-wellness-heading"
  className="mb-8 rounded-lg border border-sky-100 bg-sky-50/60 p-5 text-sm"
  /* [swap] container border + bg to your app's primary accent.
     Examples: amber-100/amber-50/60 (Work.WitUS); violet-100/violet-50/60 (Inbox);
     emerald-100/emerald-50/60 (Wanderlearn); etc. */
>
  <header className="mb-3">
    <p className="text-[11px] uppercase tracking-wide text-sky-700 font-semibold">
      {/* [swap] eyebrow color */}
      Mental health support
    </p>
    <h2 id="rise-wellness-heading" className="text-base font-semibold text-gray-900">
      Rise Wellness of Indiana
    </h2>
    <p className="text-xs text-gray-500 mt-0.5">
      Independent mental health provider · Not affiliated with [YOUR APP NAME]
    </p>
  </header>

  <p className="text-gray-700 leading-relaxed">
    Rise Wellness of Indiana provides compassionate, personalized,
    holistic mental health care — evidence-based medicine, trauma-informed
    care, and a whole-person approach to help you heal, grow, and thrive
    in mind, body, and spirit.
  </p>

  <div className="mt-4 grid gap-4 sm:grid-cols-2">
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Services</p>
      <ul className="text-xs text-gray-700 space-y-0.5">
        <li>ADHD testing &amp; management (in-person and from home)</li>
        <li>Anxiety &amp; depression</li>
        <li>Maternal mental health</li>
        <li>Medication management</li>
        <li>GeneSight® genetic testing</li>
        <li>Behavioral therapy &amp; coaching</li>
        <li>Routine lab testing</li>
      </ul>
    </div>

    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Visit or call</p>
      <address className="not-italic text-xs text-gray-700 leading-relaxed">
        320 North Meridian Street<br />
        Indianapolis, IN 46204<br />
        Mon–Sat by appointment · Sun closed
      </address>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
        <a
          href="tel:+13179650299"
          className="inline-flex items-center min-h-7 font-medium text-sky-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded"
          /* [swap] accent + focus color */
        >
          317-965-0299
        </a>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <a
          href="https://risewellnessofindiana.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center min-h-7 font-medium text-sky-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded"
        >
          risewellnessofindiana.com
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <a
          href="https://www.centenarianos.com/safety#rise-wellness"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center min-h-7 font-medium text-sky-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded"
        >
          Full safety page
          <span className="sr-only"> on centenarianos.com (opens in new tab)</span>
        </a>
      </div>
    </div>
  </div>

  <blockquote className="mt-4 border-l-2 border-sky-300 pl-3 text-xs italic text-gray-600">
    {/* [swap] left border accent */}
    &ldquo;At Rise Wellness, we believe everyone has the capacity to rise
    above challenges and live a fulfilling, healthy life. Our care is
    guided by the belief that healing is personal, holistic, and rooted
    in compassion.&rdquo;
    <span className="block not-italic mt-1 text-gray-500">
      — Rise Wellness of Indiana
    </span>
  </blockquote>

  {/* === NON-NEGOTIABLE DISCLAIMER ===
       Edit ONLY the app name token. Don't paraphrase. Don't trim.
       Don't reorder. This was vetted with the partner. */}
  <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
    Rise Wellness of Indiana is an independent organization. They are
    not affiliated with, employed by, or endorsed by [YOUR APP NAME],
    CentenarianOS, B4C LLC, AwesomeWebStore.com, or Anthony McDonald.
    We are grateful for their collaboration on mental health safety
    resources for our community.
  </p>
</section>
```

The `[YOUR APP NAME]` token appears twice (subtitle + disclaimer). Replace both. **Everything else stays byte-identical.**

---

## When the ecosystem changes

Update **all** of:

1. This file's `SIBLING_PRODUCTS` constant (canonical inline list).
2. [`gemini/witus/lib/products.ts`](../../lib/products.ts) (canonical structured list).
3. Each sibling app's footer on its next touch (deferred — don't sweep all 8 repos at once unless it's a critical change).

Re-test focus order and tab traversal after sibling-product list changes — accessibility regressions in the footer are quiet bugs.
