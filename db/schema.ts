import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  primaryKey,
  integer,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
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
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
