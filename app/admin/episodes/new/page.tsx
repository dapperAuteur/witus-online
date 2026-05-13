import Link from "next/link";
import { EpisodeForm } from "../EpisodeForm";

export const dynamic = "force-dynamic";

export default function NewEpisodePage() {
  return (
    <main id="main" className="mx-auto max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/admin/episodes"
        className="text-xs text-slate-500 hover:text-teal-300"
      >
        ← Episodes
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold tracking-tight text-slate-100">
        New episode
      </h1>
      <EpisodeForm mode="create" />
    </main>
  );
}
