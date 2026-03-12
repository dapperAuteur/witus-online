# Work.WitUS

A contractor management platform for freelance workers and crew coordinators to track jobs, log time, manage invoices, scan documents, and organize work schedules.

## Features

| Feature | Description |
|---------|-------------|
| **Job Tracking** | Create and manage contractor jobs with client info, rates, dates, and status |
| **Time Entries** | Log hours per work date with ST/OT/DT breakdown and clock in/out |
| **Invoice Generation** | Auto-generate invoices from time entries with customizable fields |
| **Document Scanner** | Scan pay stubs, invoices, call sheets, and receipts with AI extraction |
| **Multi-Day Scheduling** | Calendar-based non-consecutive date picker for multi-day jobs |
| **Job Documents** | Track incidents, best practices, notes, and scan history per job |
| **Push Notifications** | Browser alerts for clock in/out reminders and pay day |
| **Job Board** | Post available jobs publicly for other contractors to pick up |
| **Mileage & Expenses** | Trip tracking, fuel logs, and expense management |
| **Financial Dashboard** | Accounts, invoices, and payment tracking |
| **Blog & Academy** | Community blog and course marketplace |
| **PWA / Offline** | Installable app with offline support and background sync |

## Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth (email/password + MFA)
- **AI**: Google Gemini 2.5 Flash (document scanning, data extraction)
- **Payments**: Stripe
- **Media**: Cloudinary
- **Hosting**: Vercel
- **Offline**: Service Worker + IndexedDB with sync queue

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- Stripe account (for subscription features)
- Google Gemini API key (for document scanning)

### Installation

```bash
git clone <repo-url>
cd contractor-os
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ADMIN_EMAIL=
GEMINI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@centenarianos.com
CRON_SECRET=
```

### Database Setup

```bash
# Run migrations in order from supabase/migrations/
# Use Supabase CLI or SQL Editor in the dashboard
supabase db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
contractor-os/
├── app/
│   ├── api/
│   │   ├── contractor/        # Job CRUD, time entries, documents, scanning
│   │   ├── finance/           # Invoices, accounts, expenses
│   │   ├── travel/            # Trips, fuel, maintenance
│   │   ├── push/              # Push notification subscription
│   │   ├── cron/              # Scheduled notification sender
│   │   └── user/              # Preferences, notification settings
│   ├── dashboard/
│   │   ├── contractor/        # Jobs list, job detail, new job form
│   │   ├── finance/           # Financial dashboard
│   │   ├── travel/            # Mileage & vehicle tracking
│   │   ├── scan/              # Standalone document scanner
│   │   └── settings/          # User preferences & notifications
│   ├── academy/               # Course marketplace (LMS)
│   ├── blog/                  # Community blog
│   ├── terms/                 # Terms of Use
│   ├── privacy/               # Privacy Policy
│   ├── community/             # Community Code of Conduct
│   └── safety/                # Safety & Resources
├── components/
│   ├── contractor/            # Job status, summary cards, quick log
│   ├── scan/                  # ScanButton, ScanResultRouter
│   ├── ui/                    # DateCalendarPicker, SiteFooter, etc.
│   └── nav/                   # Navigation (desktop + mobile)
├── lib/
│   ├── ocr/                   # Gemini vision, document classification, extractors
│   ├── push/                  # Push subscribe (client) + send (server)
│   ├── offline/               # IndexedDB sync queue, offline fetch
│   └── supabase/              # Server & admin Supabase clients
├── public/
│   ├── sw.js                  # Service worker (caching + push)
│   ├── manifest.json          # PWA manifest
│   └── icon-*.png             # PWA icons
├── supabase/
│   └── migrations/            # Database migrations (run in order)
└── plans/                     # Implementation plans
```

## Security

- **Authentication**: Supabase Auth with optional MFA
- **Authorization**: Row Level Security (RLS) on all tables
- **Data Encryption**: TLS in transit, AES-256 at rest (Supabase)
- **Financial Data**: Private by default, never shared without consent

Report vulnerabilities: [hello@badcba.com](mailto:hello@badcba.com)

## Shared Database

This app shares a Supabase database with CentenarianOS. See `SHARED_DB.md` for details on migration coordination and shared tables.

## License

Proprietary — B4C LLC / AwesomeWebStore.com

---

**Operated by** B4C LLC / AwesomeWebStore.com — Indianapolis, Indiana
