"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db";
import { episodes, users } from "@/db/schema";
import { fetchAndParseFeed, type ParsedEpisode } from "@/lib/disctopia-rss";

const ShowSchema = z.enum(["wfc", "aamsaz"]);
const InputSchema = z.object({
  show: ShowSchema,
  feedUrl: z.string().url(),
});

export type ImportItem = {
  guid: string;
  title: string;
  itunesEpisode: number | null;
  pubDate: string | null;
  willInsert: boolean;
  existingEpisodeId?: string;
  artworkUrl: string;
  hasArtwork: boolean;
  hasHttpsArtwork: boolean;
};

export type PreviewState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "ready";
      show: "wfc" | "aamsaz";
      feedUrl: string;
      channelTitle: string;
      items: ImportItem[];
      newCount: number;
      skipCount: number;
      warnings: string[];
    };

export type CommitState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "done";
      inserted: number;
      skipped: number;
      failedGuids: string[];
    };

async function requireAdminUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();
  if (!email || email !== adminEmail) throw new Error("not authorized");
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (!existing)
    throw new Error("admin user row not minted — sign in via magic link first");
  return existing.id;
}

function readForm(formData: FormData) {
  return InputSchema.safeParse({
    show: formData.get("show"),
    feedUrl: (formData.get("feedUrl") ?? "").toString().trim(),
  });
}

export async function previewImportAction(
  _prev: PreviewState,
  formData: FormData
): Promise<PreviewState> {
  await requireAdminUserId();
  const parsed = readForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const { show, feedUrl } = parsed.data;

  let feed;
  try {
    feed = await fetchAndParseFeed(feedUrl);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Feed fetch failed.",
    };
  }

  if (feed.episodes.length === 0) {
    return { status: "error", error: "Feed parsed but found no <item> entries." };
  }

  const guids = feed.episodes.map((e) => e.guid);
  const db = getDb();
  const existing = await db
    .select({ id: episodes.id, guid: episodes.disctopiaGuid })
    .from(episodes)
    .where(inArray(episodes.disctopiaGuid, guids));
  const existingByGuid = new Map(
    existing
      .filter((r): r is { id: string; guid: string } => r.guid !== null)
      .map((r) => [r.guid, r.id])
  );

  const warnings: string[] = [];
  const items: ImportItem[] = feed.episodes.map((e) => {
    const existingId = existingByGuid.get(e.guid);
    const hasHttpsArtwork = e.artworkUrl.startsWith("https://");
    if (e.artworkUrl && !hasHttpsArtwork) {
      warnings.push(`Non-https artwork for "${e.title}" — outbox requires https.`);
    }
    return {
      guid: e.guid,
      title: e.title,
      itunesEpisode: e.itunesEpisode,
      pubDate: e.pubDate?.toISOString() ?? null,
      willInsert: !existingId,
      existingEpisodeId: existingId,
      artworkUrl: e.artworkUrl,
      hasArtwork: e.artworkUrl.length > 0,
      hasHttpsArtwork,
    };
  });

  const newCount = items.filter((i) => i.willInsert).length;
  const skipCount = items.length - newCount;

  return {
    status: "ready",
    show,
    feedUrl,
    channelTitle: feed.channelTitle,
    items,
    newCount,
    skipCount,
    warnings,
  };
}

export async function commitImportAction(
  _prev: CommitState,
  formData: FormData
): Promise<CommitState> {
  const adminUserId = await requireAdminUserId();
  const parsed = readForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const { show, feedUrl } = parsed.data;

  let feed;
  try {
    feed = await fetchAndParseFeed(feedUrl);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Feed fetch failed.",
    };
  }

  const guids = feed.episodes.map((e) => e.guid);
  const db = getDb();
  const existing = await db
    .select({ guid: episodes.disctopiaGuid })
    .from(episodes)
    .where(inArray(episodes.disctopiaGuid, guids));
  const skipSet = new Set(
    existing.map((r) => r.guid).filter((g): g is string => g !== null)
  );

  const toInsert = feed.episodes.filter(
    (e) => !skipSet.has(e.guid) && isInsertable(e)
  );

  let inserted = 0;
  const failedGuids: string[] = [];

  for (const e of toInsert) {
    try {
      await db.insert(episodes).values({
        show,
        episodeNumber: e.itunesEpisode,
        title: e.title,
        showNotes: e.showNotes || e.title,
        showNotesExcerpt: e.showNotesExcerpt || e.title,
        artworkUrl: e.artworkUrl,
        disctopiaUrl: e.disctopiaUrl,
        disctopiaGuid: e.guid,
        // Imported rows land as drafts; manual review + publish fires the
        // outbox trigger. Backfilled history never auto-fires.
        status: "draft",
        createdBy: adminUserId,
      });
      inserted += 1;
    } catch {
      failedGuids.push(e.guid);
    }
  }

  revalidatePath("/admin/episodes");
  revalidatePath("/admin/episodes/import");

  return {
    status: "done",
    inserted,
    skipped: skipSet.size,
    failedGuids,
  };
}

function isInsertable(e: ParsedEpisode): boolean {
  if (!e.guid || !e.title) return false;
  // Require https artwork — outbox requires https media URLs. Skip rows
  // without a usable image so we don't poison the queue with broken refs.
  return e.artworkUrl.startsWith("https://");
}
