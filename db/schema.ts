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
    episodeNumber: integer("episode_number").notNull(),
    title: text("title").notNull(),
    showNotes: text("show_notes").notNull(),
    showNotesExcerpt: text("show_notes_excerpt").notNull(),
    artworkUrl: text("artwork_url").notNull(),
    disctopiaUrl: text("disctopia_url").notNull(),
    status: episodeStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
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
  (t) => [unique("episode_show_number_unique").on(t.show, t.episodeNumber)]
);
