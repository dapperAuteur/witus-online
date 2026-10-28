import { pgTable, pgEnum, text, timestamp, primaryKey, integer, bigint, uuid, unique, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/** NextAuth tables. Standard @auth/drizzle-adapter shape. Mirrors witus-inbox. */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const podcastShow = pgEnum("podcast_show", ["wfc", "aamsaz"]);

export const episodeStatus = pgEnum("episode_status", ["draft", "published"]);

export const episodes = pgTable(
  "episode",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    show: podcastShow("show").notNull(),
    // Nullable: Disctopia's <itunes:episode> isn't unique across sub-series
    // within one podcast (BVC, NASM, All-the-Spoilers all number from 1).
    // Manually-created episodes still set a number via the create form.
    episodeNumber: integer("episode_number"),
    title: text("title").notNull(),
    showNotes: text("show_notes").notNull(),
    showNotesExcerpt: text("show_notes_excerpt").notNull(),
    artworkUrl: text("artwork_url").notNull(),
    disctopiaUrl: text("disctopia_url").notNull(),
    status: episodeStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Set by the RSS importer; null for manually-created episodes. Unique
    // across all rows when not null — RSS <guid> is the only reliable
    // per-episode identifier from Disctopia.
    disctopiaGuid: text("disctopia_guid"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("episode_disctopia_guid_unique").on(t.disctopiaGuid),
  ]
);

// Invitations gate sign-in. Auth flow: signIn callback allows session.user.email
// when it === ADMIN_EMAIL OR when an active (non-revoked, non-expired)
// invitation matches. acceptedAt is stamped on first successful sign-in so the
// admin UI can distinguish pending vs. accepted invites.
export const invitations = pgTable("invitation", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Private library — long-form internal ebooks (interview prep, commercial
// playbook) readable only by the ADMIN_EMAIL account at /admin/library.
// Content lives in the DB, never in this (public) repo; it is upserted from
// local markdown via `node scripts/sync-library.mjs <files...>`.
export const libraryDocuments = pgTable("library_document", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  // The sibling PDF of the markdown source, base64 encoded, so the owner can
  // download the typeset copy instead of only reading the rendered markdown.
  // Base64 in `text` rather than `bytea` on purpose: the runtime client is the
  // Neon HTTP driver (db/index.ts), which hands binary columns back as a
  // driver-formatted string rather than a Buffer, and drizzle has no bytea
  // column type, so a `customType` would have to re-parse that format on every
  // read. Base64 round-trips losslessly through both the driver and the plain
  // `sql` tagged template the sync script uses. Cost is roughly 33% extra
  // storage on files under a megabyte. NULL when no sibling PDF was found.
  pdf: text("pdf"),
  // Size of the DECODED pdf in bytes, so the UI can show a file size without
  // pulling the payload. Set together with `pdf`; NULL exactly when it is NULL.
  pdfBytes: integer("pdf_bytes"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Ecosystem cost registry (admin/costs). Every third-party service the ecosystem pays for or
// could pay for: plan, fee, how it bills, where to log in. Rows marked usageSource = "manual" are
// BAM's own entries; "vercel", "vercel_store" and "neon" rows are refreshed by lib/costs/collect.ts
// (daily cron + the Refresh button). Never a secret in here: tokens live in env.
// ---------------------------------------------------------------------------
export const services = pgTable("service", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  category: text("category").notNull().default("infrastructure"),
  /** Plan name as the vendor shows it ("Pro", "Free", "Launch"). Unverified until lastVerifiedAt is set. */
  plan: text("plan"),
  /** "vercel" (on the Vercel invoice), "direct", "appsumo", "none" */
  billedVia: text("billed_via").notNull().default("direct"),
  baseFeeMonthly: numeric("base_fee_monthly", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  accountUrl: text("account_url"),
  /** "vercel" | "vercel_store" | "neon" | "manual" */
  usageSource: text("usage_source").notNull().default("manual"),
  /** Vendor-side id the collector keys on (Vercel store id, Neon project id). */
  externalId: text("external_id"),
  /** Which ecosystem apps use it, comma-separated product slugs. */
  usedBy: text("used_by"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceSnapshots = pgTable("service_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceSlug: text("service_slug")
    .notNull()
    .references(() => services.slug, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  /** Usage-based cost in the period, as the vendor reports it (before credits). */
  usageCost: numeric("usage_cost", { precision: 12, scale: 4 }).notNull().default("0"),
  /** Flat fee in the period (licenses, seats), if the vendor reports it separately. */
  baseFee: numeric("base_fee", { precision: 10, scale: 2 }),
  /** Per-line breakdown: [{ line, quantity, unit, cost }] */
  lines: jsonb("lines").$type<{ line: string; quantity: number; unit: string; cost: number; project?: string }[]>(),
  /** Anything else worth keeping (credit remaining, branch counts, plan ids). */
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  source: text("source").notNull(),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Claude Code usage snapshots (admin/usage). One row per run of `scripts/usage-report.mjs --push`,
// taken on BAM's machine from the local Claude Code transcripts: de-duplicated token totals, the
// API-equivalent list price, and the mistake ledger total. Money columns are US dollars of API list
// price; the page shows them as credits, 1 credit = 1 US dollar. The subscription does not bill per
// token, so these are API-equivalent figures, not what the plan charges. Nothing from a transcript is
// stored here beyond token counts, timestamps, model ids and the ledger rows BAM wrote.
// ---------------------------------------------------------------------------
export const claudeUsageSnapshots = pgTable("claude_usage_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  /** Hostname of the machine whose transcripts were read. */
  machine: text("machine").notNull(),
  coverageStart: timestamp("coverage_start", { withTimezone: true }),
  coverageEnd: timestamp("coverage_end", { withTimezone: true }),
  /** Distinct API responses after de-duplication by message id. */
  responses: integer("responses").notNull().default(0),
  // Token counts reach the billions (cache reads), so bigint, read back as a JS number.
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
  cacheWrite5mTokens: bigint("cache_write_5m_tokens", { mode: "number" }).notNull().default(0),
  cacheWrite1hTokens: bigint("cache_write_1h_tokens", { mode: "number" }).notNull().default(0),
  cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
  /** API-equivalent list price of everything in the coverage range, US dollars. */
  listPriceUsd: numeric("list_price_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  /** Same, for the counted mistake-ledger rows only. */
  mistakePriceUsd: numeric("mistake_price_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  /** mistake_price_usd / list_price_usd, a fraction (0.0189 = 1.89 percent). */
  mistakeShare: numeric("mistake_share", { precision: 9, scale: 6 }).notNull().default("0"),
  /** By-month, by-model and by-project tables, the ledger rows, the unpriced models, the price table source. */
  detail: jsonb("detail").$type<Record<string, unknown>>(),
});
