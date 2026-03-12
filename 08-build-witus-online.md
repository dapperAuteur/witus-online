# Plan 08: Build WitUS.online (new site)

## Context
WitUS.online is the parent platform landing page that links to both Work.WitUS.Online and CentenarianOS.com. Simple, clean site establishing WitUS as the unified community/platform brand.

## Branding Hierarchy
- **B4C LLC / AwesomeWebStore.com** — legal entity
- **WitUS.online** — parent platform/community (THIS SITE)
  - **Work.WitUS.Online** — contractor app (formerly JobHub)
  - **CentenarianOS.com** — longevity app

## Tech Stack
- Next.js (App Router) — consistent with both apps
- Tailwind CSS — consistent with both apps
- Static site (no auth, no database needed initially)
- Deploy on Vercel

---

## Pages

### 1. Landing Page (`/`)
- Hero: "WitUS" logo/wordmark + tagline: "Your unified platform for life and work"
- Two product cards:
  - **CentenarianOS** — "The multi-decade personal operating system" → CentenarianOS.com
  - **Work.WitUS** — "Job tracking, invoicing, and business tools for independent contractors" → Work.WitUS.Online
- "One account, two platforms" section explaining unified auth
- Footer: "WitUS.online is a B4C LLC brand"

### 2. About Page (`/about`)
- Mission statement
- B4C LLC info
- Team/founder info

### 3. Legal Pages
- `/terms` — Umbrella terms covering both platforms
- `/privacy` — Umbrella privacy policy

### 4. Account Info Page (`/account`)
- Explains: "Your WitUS account works across all our platforms"
- Links to login on each app
- FAQ about shared accounts, email domain

## File Structure
```
witus-online/
├── app/
│   ├── layout.tsx          # Root layout, metadata, fonts
│   ├── page.tsx            # Landing page
│   ├── about/page.tsx
│   ├── account/page.tsx
│   ├── terms/page.tsx
│   ├── privacy/page.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ProductCard.tsx
├── public/
│   ├── manifest.json
│   └── favicon.ico
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

## Design
- Neutral/professional palette (not amber or fuchsia — those are product-specific)
- Suggested: Deep navy (`bg-slate-950`) + white text + subtle gradient accents
- Product cards use each app's accent: amber for Work.WitUS, fuchsia for CentenarianOS
- Clean, minimal — this is a hub, not a feature-rich app

---

## Verification
- `npm run build` passes
- All pages render correctly
- Links to Work.WitUS.Online and CentenarianOS.com work
- Responsive on mobile and desktop
