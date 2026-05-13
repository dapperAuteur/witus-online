import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { episodes } from "@/db/schema";
import { EpisodeForm } from "../EpisodeForm";
import { PublishButton } from "./PublishButton";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const db = getDb();
  const episode = await db.query.episodes.findFirst({
    where: eq(episodes.id, id),
  });
  if (!episode) notFound();

  return (
    <main id="main" className="mx-auto max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/admin/episodes"
        className="text-xs text-slate-500 hover:text-teal-300"
      >
        ← Episodes
      </Link>
      <header className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100 truncate">
            Episode #{episode.episodeNumber} — {episode.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {episode.status === "published" && episode.publishedAt
              ? `Published ${episode.publishedAt.toISOString().slice(0, 10)}`
              : `Draft · created ${episode.createdAt
                  .toISOString()
                  .slice(0, 10)}`}
          </p>
        </div>
        {episode.status === "draft" ? (
          <PublishButton id={episode.id} />
        ) : null}
      </header>

      <EpisodeForm
        mode="edit"
        episodeId={episode.id}
        defaults={{
          show: episode.show,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          showNotes: episode.showNotes,
          showNotesExcerpt: episode.showNotesExcerpt,
          artworkUrl: episode.artworkUrl,
          disctopiaUrl: episode.disctopiaUrl,
        }}
      />
    </main>
  );
}
