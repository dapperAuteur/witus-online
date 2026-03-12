# BAM — Brand Anthony McDonald

Personal brand platform and portfolio for Brand Anthony McDonald: developer advocate, voiceover artist, business consultant, and content creator.

## About

This is a full-stack Next.js web application serving as BAM's professional home on the web. It combines a public-facing portfolio and blog with a private admin dashboard and client portal system.

**What it does:**
- Showcases professional services: developer advocacy, voiceover, technical education, brand consulting, and content creation
- Hosts 70+ blog articles across technology, education, African heritage, fitness, and more
- Provides a client portal for project-based access with per-project custom URLs
- Includes a gallery system for client deliverables with Cloudinary-backed image hosting
- Features an admin dashboard for managing content, projects, contacts, and analytics

## Features

- **Landing Page** — Hero, services showcase, about section, portfolio, and contact form with reCAPTCHA v3
- **Blog** — 70+ articles with categories, individual post pages, and admin management
- **Client Portal** — Project-based access at `/portal/[projectId]` with JWT-authenticated sessions
- **Admin Dashboard** — Manage blog posts, projects, gallery, contacts, education submissions, and workout feedback
- **Gallery** — Cloudinary-integrated image gallery for clients
- **Education** — Corvids e-book download and educational submission tracking
- **Analytics** — Vercel Analytics + per-project engagement tracking

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS, Framer Motion |
| Database | MongoDB Atlas (Mongoose) |
| Auth | NextAuth v4 + JWT |
| Storage | Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| AI | Google Gemini API |
| Analytics | Vercel Analytics |
| UI Components | Radix UI, Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster
- Cloudinary account
- Google reCAPTCHA v3 keys
- Gmail account with app password
- Google Gemini API key

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file at the project root:

```env
# Database
MONGODB_URI=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
EMAIL_USER=
EMAIL_PASS=

# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Google Gemini AI
GEMINI_API_KEY=

# Admin
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
```

## Key Routes

| Route | Description |
|---|---|
| `/` | Homepage |
| `/experience` | Work experience timeline |
| `/blog/[slug]` | Blog post |
| `/portal/[projectId]` | Client project portal |
| `/client-gallery` | Public gallery |
| `/education/corvids-ebook-download` | E-book download |
| `/admin/*` | Admin dashboard (protected) |
| `/login` | Login page |

## Docs

See the [`/docs`](./docs/) directory for site management guides:

- [MANAGE_SITE.md](./docs/MANAGE_SITE.md) — Adding experiences, projects, and skills
- [MANAGE_BLOG.md](./docs/MANAGE_BLOG.md) — Blog management
- [MANAGE_SHARE.md](./docs/MANAGE_SHARE.md) — Social sharing features

## Privacy

See [PRIVACY.md](./PRIVACY.md) for the privacy policy covering data collection and handling on this platform.
