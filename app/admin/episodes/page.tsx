import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { episodes } from "@/db/schema";

export const dynamic = "force-dynamic";

const SHOW_LABEL: Record<"wfc" | "aamsaz", string> = {
  wfc: "World's Fastest Centenarian",
  aamsaz: "African American Museum of Southern Arizona",
};

export default async function EpisodesListPage() {
  const db = getDb();
  const [wfcRows, aamsazRows] = await Promise.all([
    db
      .select({
        id: episodes.id,
        episodeNumber: episodes.episodeNumber,
        title: episodes.title,
        status: episodes.status,
        publishedAt: episodes.publishedAt,
        updatedAt: episodes.updatedAt,
      })
      .from(episodes)
      .where(eq(episodes.show, "wfc"))
      .orderBy(desc(episodes.episodeNumber)),
    db
      .select({
        id: episodes.id,
        episodeNumber: episodes.episodeNumber,
        title: episodes.title,
        status: episodes.status,
        publishedAt: episodes.publishedAt,
        updatedAt: episodes.updatedAt,
      })
      .from(episodes)
      .where(eq(episodes.show, "aamsaz"))
      .orderBy(desc(episodes.episodeNumber)),
  ]);

  return (
    <main id="main" className="mx-auto max-w-5xl flex-1 px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Episodes
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/episodes/import"
            className="inline-flex items-center min-h-11 px-4 py-2 rounded-lg border border-slate-700 hover:border-teal-400 hover:text-teal-300 text-slate-100 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            Import from RSS
          </Link>
          <Link
            href="/admin/episodes/new"
            className="inline-flex items-center min-h-11 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            New episode
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        <ShowSection show="wfc" rows={wfcRows} />
        <ShowSection show="aamsaz" rows={aamsazRows} />
      </div>
    </main>
  );
}

type Row = {
  id: string;
  episodeNumber: number | null;
  title: string;
  status: "draft" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
};

function ShowSection({ show, rows }: { show: "wfc" | "aamsaz"; rows: Row[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {SHOW_LABEL[show]} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No episodes yet.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-4 px-4 py-3">
              <span className="font-mono text-xs text-slate-500 w-10 shrink-0">
                {row.episodeNumber != null ? `#${row.episodeNumber}` : "—"}
              </span>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/episodes/${row.id}`}
                  className="block truncate text-sm font-medium text-slate-100 hover:text-teal-300"
                >
                  {row.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {row.status === "published" && row.publishedAt
                    ? `Published ${row.publishedAt.toISOString().slice(0, 10)}`
                    : `Draft · updated ${row.updatedAt.toISOString().slice(0, 10)}`}
                </p>
              </div>
              <StatusPill status={row.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: "draft" | "published" }) {
  const classes =
    status === "published"
      ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
      : "bg-slate-700/30 text-slate-300 border-slate-600/40";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}
