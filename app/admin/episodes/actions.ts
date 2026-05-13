"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db";
import { episodes, users } from "@/db/schema";
import { firePodcastEpisodePublished } from "@/lib/podcast-trigger";

const ShowSchema = z.enum(["wfc", "aamsaz"]);

const EpisodeFormSchema = z.object({
  show: ShowSchema,
  episodeNumber: z.coerce.number().int().positive(),
  title: z.string().min(1).max(300),
  showNotes: z.string().min(1).max(20000),
  showNotesExcerpt: z.string().min(1).max(600),
  artworkUrl: z.string().url().refine((v) => v.startsWith("https://"), {
    message: "artworkUrl must be https",
  }),
  disctopiaUrl: z.string().url().refine((v) => v.startsWith("https://"), {
    message: "disctopiaUrl must be https",
  }),
});

export type EpisodeFormValues = z.infer<typeof EpisodeFormSchema>;

export type FormState = {
  status: "idle" | "error";
  error?: string;
  fieldErrors?: Partial<Record<keyof EpisodeFormValues, string>>;
};

async function requireAdminUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();
  if (!email || email !== adminEmail) {
    throw new Error("not authorized");
  }
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (!existing) {
    throw new Error("admin user row not minted — sign in via magic link first");
  }
  return existing.id;
}

async function requireAdminEmail(): Promise<string> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();
  if (!email || email !== adminEmail) {
    throw new Error("not authorized");
  }
  return email;
}

function readForm(formData: FormData): FormState | EpisodeFormValues {
  const parsed = EpisodeFormSchema.safeParse({
    show: formData.get("show"),
    episodeNumber: formData.get("episodeNumber"),
    title: (formData.get("title") ?? "").toString().trim(),
    showNotes: (formData.get("showNotes") ?? "").toString().trim(),
    showNotesExcerpt: (formData.get("showNotesExcerpt") ?? "").toString().trim(),
    artworkUrl: (formData.get("artworkUrl") ?? "").toString().trim(),
    disctopiaUrl: (formData.get("disctopiaUrl") ?? "").toString().trim(),
  });
  if (!parsed.success) {
    const fieldErrors: FormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof EpisodeFormValues | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", error: "Check the fields below.", fieldErrors };
  }
  return parsed.data;
}

export async function createEpisodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const adminUserId = await requireAdminUserId();
  const result = readForm(formData);
  if ("status" in result) return result;

  const db = getDb();
  let newId: string;
  try {
    const inserted = await db
      .insert(episodes)
      .values({
        show: result.show,
        episodeNumber: result.episodeNumber,
        title: result.title,
        showNotes: result.showNotes,
        showNotesExcerpt: result.showNotesExcerpt,
        artworkUrl: result.artworkUrl,
        disctopiaUrl: result.disctopiaUrl,
        createdBy: adminUserId,
      })
      .returning({ id: episodes.id });
    newId = inserted[0]!.id;
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.message.includes("episode_show_number_unique")
        ? `Episode #${result.episodeNumber} already exists for ${result.show}.`
        : "Could not create episode.";
    return { status: "error", error: message };
  }

  revalidatePath("/admin/episodes");
  redirect(`/admin/episodes/${newId}`);
}

export async function updateEpisodeAction(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdminUserId();
  const result = readForm(formData);
  if ("status" in result) return result;

  const db = getDb();
  try {
    await db
      .update(episodes)
      .set({
        show: result.show,
        episodeNumber: result.episodeNumber,
        title: result.title,
        showNotes: result.showNotes,
        showNotesExcerpt: result.showNotesExcerpt,
        artworkUrl: result.artworkUrl,
        disctopiaUrl: result.disctopiaUrl,
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, id));
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.message.includes("episode_show_number_unique")
        ? `Episode #${result.episodeNumber} already exists for ${result.show}.`
        : "Could not update episode.";
    return { status: "error", error: message };
  }

  revalidatePath("/admin/episodes");
  revalidatePath(`/admin/episodes/${id}`);
  return { status: "idle" };
}

export async function publishEpisodeAction(id: string): Promise<void> {
  const triggerUserEmail = await requireAdminEmail();
  const db = getDb();

  const [updated] = await db
    .update(episodes)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(episodes.id, id))
    .returning();

  if (!updated) return;

  // Fire AFTER the DB write succeeds. External_ref is keyed on episode.id so
  // a re-publish (or re-fire from edit) is idempotent at the outbox receiver.
  // The trigger is fire-and-forget via next/server's after() — does not block
  // the user-facing redirect.
  firePodcastEpisodePublished({
    show: updated.show,
    triggerUserEmail,
    episodeId: updated.id,
    episodeNumber: updated.episodeNumber,
    title: updated.title,
    showNotesExcerpt: updated.showNotesExcerpt,
    artworkUrl: updated.artworkUrl,
    disctopiaUrl: updated.disctopiaUrl,
  });

  revalidatePath("/admin/episodes");
  revalidatePath(`/admin/episodes/${id}`);
}
