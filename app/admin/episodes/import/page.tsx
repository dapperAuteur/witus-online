import Link from "next/link";
import { ImportFlow } from "./ImportFlow";

export const dynamic = "force-dynamic";

const WFC_FEED =
  "https://play.disctopia.com/podcast/rss?channel=bam_worlds_fastest_centenarian";
const AAMSAZ_FEED =
  "https://play.disctopia.com/podcast/rss?channel=african-american-museum-of-southern-arizona-podcast";

export default function ImportEpisodesPage() {
  return (
    <main id="main" className="mx-auto max-w-4xl flex-1 px-4 py-8">
      <Link
        href="/admin/episodes"
        className="text-xs text-slate-500 hover:text-teal-300"
      >
        ← Episodes
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
        Import from Disctopia RSS
      </h1>
      <p className="mt-2 max-w-prose text-sm text-slate-400">
        Backfill historical episodes from the Disctopia RSS feed. Imported
        rows land as <span className="font-mono text-slate-200">drafts</span>{" "}
        — the outbox trigger only fires when you click <em>Publish</em>, so
        backfilled history never auto-blasts to social. Re-running the
        importer is safe: matches on the RSS <code>&lt;guid&gt;</code> and
        skips rows already in the DB.
      </p>
      <ImportFlow defaultWfcFeed={WFC_FEED} defaultAamsazFeed={AAMSAZ_FEED} />
    </main>
  );
}
