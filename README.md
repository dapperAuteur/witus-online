# WitUS.online

The parent brand platform for the WitUS ecosystem — a philosophy-first site connecting [CentenarianOS](https://centenarianos.com) and [Work.WitUS](https://work.witus.online).

## About

WitUS.online establishes the brand and philosophy behind the WitUS platform: **Live Long. Work Free.** It serves as the public-facing home for the ecosystem before a user ever logs into either product — the "why" behind both apps.

Operated by B4C LLC / AwesomeWebStore.com. Built by [Brand Anthony McDonald](https://brandanthonymcdonald.com).

## Branding Hierarchy

```
B4C LLC / AwesomeWebStore.com  ← legal entity
└── WitUS.online               ← parent brand (this repo)
    ├── CentenarianOS.com      ← multi-decade personal OS
    └── Work.WitUS.Online      ← contractor management platform
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |
| Auth/DB | None (fully static) |

## Pages

| Route | Description |
|---|---|
| `/` | Philosophy-first hero + product cards |
| `/about` | Manifesto + BAM background |
| `/roadmap` | Public roadmap for both platforms |
| `/account` | Shared account explainer + FAQ |
| `/terms` | Umbrella terms of service |
| `/privacy` | Privacy policy covering both apps |

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
witus-online/
├── app/
│   ├── layout.tsx          # Root layout, metadata, fonts
│   ├── page.tsx            # Landing page
│   ├── about/page.tsx      # Philosophy + founder background
│   ├── roadmap/page.tsx    # Public product roadmap
│   ├── account/page.tsx    # Shared account info + FAQ
│   ├── terms/page.tsx      # Terms of service
│   ├── privacy/page.tsx    # Privacy policy
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx       # Reusable card with amber/fuchsia accent
│   ├── ManifestoSection.tsx  # Bold pullquote block
│   └── RoadmapItem.tsx       # Status-badged roadmap row
└── public/
```

## Design

- **Navy foundation** (`#020617`) with white text — neutral, not product-specific
- **Amber** accents for Work.WitUS elements
- **Fuchsia** accents for CentenarianOS elements
- Fully static — no database, no auth, no server-side rendering

## Deployment

Deployed on Vercel. Pushes to `main` trigger automatic production deploys.

```bash
# Manual deploy
npx vercel --prod
```

## License

Proprietary — B4C LLC / AwesomeWebStore.com
