// Services the ecosystem is known to use, from env names and integrations in the repos (read
// 2026-10-15). Plans and fees are NOT asserted here: BAM sets them on the page, and lastVerifiedAt
// records when. accountUrl is the vendor's own dashboard entry point, never an account-specific
// guess. The collectors (Vercel, Vercel marketplace, Neon) add and refresh their own rows.
export interface SeedService {
  slug: string;
  name: string;
  vendor: string;
  category: string;
  billedVia: "vercel" | "direct" | "appsumo" | "none";
  accountUrl: string;
  usedBy?: string;
  notes?: string;
}

export const SEED_SERVICES: SeedService[] = [
  { slug: "vercel", name: "Vercel (team bam-apps)", vendor: "Vercel", category: "hosting", billedVia: "direct", accountUrl: "https://vercel.com/bam-apps/~/settings/billing", usedBy: "all web apps", notes: "Pro platform fee includes $20 usage credit; marketplace resources bill on the same invoice" },
  { slug: "mongodb-atlas", name: "MongoDB Atlas", vendor: "MongoDB", category: "database", billedVia: "direct", accountUrl: "https://cloud.mongodb.com", usedBy: "flashlearnai, bam-landing-page", notes: "cost is the cluster tier; nothing per preview" },
  { slug: "cloudinary", name: "Cloudinary", vendor: "Cloudinary", category: "media", billedVia: "direct", accountUrl: "https://console.cloudinary.com", usedBy: "wanderlust, create-witus, contractor-os" },
  { slug: "mailgun", name: "Mailgun", vendor: "Sinch Mailgun", category: "email", billedVia: "direct", accountUrl: "https://app.mailgun.com", usedBy: "witus-online, witus-inbox, ecosystem mailer" },
  { slug: "posthog", name: "PostHog", vendor: "PostHog", category: "analytics", billedVia: "direct", accountUrl: "https://us.posthog.com", usedBy: "all apps (plan 26)" },
  { slug: "sentry", name: "Sentry", vendor: "Functional Software", category: "observability", billedVia: "direct", accountUrl: "https://sentry.io/settings/", usedBy: "most apps" },
  { slug: "better-stack", name: "Better Stack (logs, heartbeat)", vendor: "Better Stack", category: "observability", billedVia: "direct", accountUrl: "https://telemetry.betterstack.com", usedBy: "witus-inbox log drain, witus heartbeat" },
  { slug: "honeycomb", name: "Honeycomb", vendor: "Honeycomb", category: "observability", billedVia: "direct", accountUrl: "https://ui.honeycomb.io", usedBy: "witus-online" },
  { slug: "keap", name: "Keap", vendor: "Keap", category: "crm", billedVia: "direct", accountUrl: "https://signin.infusionsoft.com", usedBy: "witus-online" },
  { slug: "stripe", name: "Stripe (fees)", vendor: "Stripe", category: "payments", billedVia: "direct", accountUrl: "https://dashboard.stripe.com", usedBy: "learn-witus, stay-witus, contractor-os, flashlearnai", notes: "per-transaction fees, not a subscription" },
  { slug: "mobile-text-alerts", name: "Mobile Text Alerts", vendor: "Mobile Text Alerts", category: "messaging", billedVia: "direct", accountUrl: "https://app.mobile-text-alerts.com", usedBy: "witus-inbox" },
  { slug: "ocoya", name: "Ocoya", vendor: "Ocoya", category: "social publishing", billedVia: "appsumo", accountUrl: "https://app.ocoya.com", usedBy: "witus-outbox" },
  { slug: "socialchamp", name: "SocialChamp", vendor: "SocialChamp", category: "social publishing", billedVia: "appsumo", accountUrl: "https://app.socialchamp.io", usedBy: "witus-outbox" },
  { slug: "firebase", name: "Firebase (Hosting, Auth, Firestore)", vendor: "Google", category: "hosting", billedVia: "direct", accountUrl: "https://console.firebase.google.com", usedBy: "fit-t-cent-assessments, p-meft" },
  { slug: "github", name: "GitHub", vendor: "GitHub", category: "source control", billedVia: "direct", accountUrl: "https://github.com/settings/billing", usedBy: "every repo" },
  { slug: "anthropic", name: "Claude (Anthropic)", vendor: "Anthropic", category: "ai", billedVia: "direct", accountUrl: "https://claude.ai/settings/billing", usedBy: "Claude Code, witus-triage-agent, centenarian-coach", notes: "subscription plus the $250 cloud-session credit expiring 2026-11-04" },
  { slug: "google-ai", name: "Google AI (Gemini API)", vendor: "Google", category: "ai", billedVia: "direct", accountUrl: "https://aistudio.google.com", usedBy: "witus-online, flashlearnai, centenarian-academy" },
  { slug: "cloudflare", name: "Cloudflare (Turnstile)", vendor: "Cloudflare", category: "security", billedVia: "none", accountUrl: "https://dash.cloudflare.com", usedBy: "public forms" },
  { slug: "domains", name: "Domain registrar(s)", vendor: "(set on the page)", category: "domains", billedVia: "direct", accountUrl: "https://vercel.com/bam-apps/~/domains", usedBy: "every product domain", notes: "the registrar list lives in plans/ecosystem/BAM-tools.xlsx (domains sheet); set the registrar and the annual total here" },
  { slug: "appsumo", name: "AppSumo lifetime tools", vendor: "AppSumo", category: "tools", billedVia: "appsumo", accountUrl: "https://appsumo.com/account/products/", notes: "one-time purchases; inventory in plans/ecosystem/BAM-tools.xlsx" },
];
