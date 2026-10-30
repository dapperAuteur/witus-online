import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnv } from "@/lib/env";
import { loadAppRoadmap, type CommitInfo } from "@/lib/roadmap/github";
import { roadmapAppBySlug } from "@/lib/roadmap/registry";
import { appSlugMatches, KNOWN_SECTIONS, STALE_AFTER_DAYS } from "@/lib/roadmap/roadmap.mjs";
import { RefreshButton } from "../refresh-button";
import { day, ErrorCard, InlineText, LINK, StageCell, StaleFlag, summarize } from "../roadmap-parts";

export const dynamic = "force-dynamic";

const INDENT = ["ml-5", "ml-10", "ml-14", "ml-18"];
const STANDARD_HEADINGS = Object.keys(KNOWN_SECTIONS).map((h) => h[0].toUpperCase() + h.slice(1));

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

function Commit({ c }: { c: CommitInfo | null }) {
  if (!c) return <span className="text-slate-500">Unknown</span>;
  return (
    <>
      <ExternalLink href={c.url}>{day(c.date)}</ExternalLink>{" "}
      <span className="text-slate-400">{c.message}</span>
    </>
  );
}

export default async function RoadmapDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = roadmapAppBySlug(slug);
  if (!app) notFound();

  const a = await loadAppRoadmap(app, getEnv().GITHUB_ROADMAP_TOKEN);
  const r = a.roadmap;
  const row = summarize(a);
  const presentKeys = new Set(r?.sections.map((s) => s.key).filter(Boolean));
  const absent = STANDARD_HEADINGS.filter((h) => !presentKeys.has(KNOWN_SECTIONS[h.toLowerCase() as keyof typeof KNOWN_SECTIONS]));
  const slugMismatch = r?.meta.app && !appSlugMatches(r.meta.app, app.slug, app.aliases);
  const siteUrl = r?.meta.url && /^https?:\/\//i.test(r.meta.url) ? r.meta.url : null;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/roadmap" className={LINK}>
          ← All apps
        </Link>
      </p>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{r?.meta.name ?? app.name}</h1>
          {app.note ? <p className="mt-1 text-sm text-slate-400">{app.note}</p> : null}
        </div>
        <RefreshButton />
      </header>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-slate-800 p-4 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-400">Stage</dt>
        <dd><StageCell app={a} row={row} /></dd>
        <dt className="text-slate-400">Roadmap updated</dt>
        <dd className="text-slate-200">{r?.meta.updated ?? "Unknown"}</dd>
        <dt className="text-slate-400">Roadmap file, last commit</dt>
        <dd className="break-words"><Commit c={a.roadmapCommit} /></dd>
        <dt className="text-slate-400">App repo, last commit to {app.branch}</dt>
        <dd className="break-words">{app.githubRepo ? <Commit c={a.repoCommit} /> : <span className="text-slate-500">No app repo</span>}</dd>
        <dt className="text-slate-400">Staleness</dt>
        <dd>
          <StaleFlag stale={a.stale} />
          {a.stale ? (
            <span className="ml-2 text-slate-400">
              main is more than {STALE_AFTER_DAYS} days ahead of the roadmap. Update the file in the next change that ships.
            </span>
          ) : null}
        </dd>
        <dt className="text-slate-400">Roadmap file</dt>
        <dd className="break-all">
          {a.fileUrl ? <ExternalLink href={a.fileUrl}>{`${app.roadmapRepo}/${app.roadmapPath}`}</ExternalLink> : "No GitHub remote"}
        </dd>
        {app.githubRepo && app.githubRepo !== app.roadmapRepo ? (
          <>
            <dt className="text-slate-400">App repo</dt>
            <dd className="break-all"><ExternalLink href={`https://github.com/${app.githubRepo}`}>{app.githubRepo}</ExternalLink></dd>
          </>
        ) : null}
        {siteUrl ? (
          <>
            <dt className="text-slate-400">Site</dt>
            <dd className="break-all"><ExternalLink href={siteUrl}>{siteUrl}</ExternalLink></dd>
          </>
        ) : null}
      </dl>

      {a.state === "no-token" ? (
        <p className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
          Not read: set <span className="font-mono">GITHUB_ROADMAP_TOKEN</span> (task 132).
        </p>
      ) : null}
      {a.state === "missing" ? (
        <p className="rounded-lg border border-slate-700 p-4 text-sm text-slate-300">
          No roadmap yet: <span className="font-mono">{app.roadmapPath}</span> is not on {app.branch}. Expected until the
          seeding branch is merged.
        </p>
      ) : null}
      {a.state === "no-remote" ? (
        <p className="rounded-lg border border-slate-700 p-4 text-sm text-slate-300">
          This app has no GitHub remote, so there is nothing to read.
        </p>
      ) : null}
      <ErrorCard app={a} />

      {(r?.warnings.length || slugMismatch || (a.state === "ok" && a.error)) ? (
        <ul className="list-disc space-y-1 rounded-lg border border-amber-700 p-4 pl-8 text-sm text-amber-100">
          {slugMismatch ? (
            <li>
              The file says <span className="font-mono">app: {r?.meta.app}</span>; the registry slug is{" "}
              <span className="font-mono">{app.slug}</span>.
            </li>
          ) : null}
          {r?.warnings.map((w) => <li key={w}>{w}</li>)}
          {a.state === "ok" && a.error ? <li>{a.error}</li> : null}
        </ul>
      ) : null}

      {r?.sections.map((s, i) => (
        <section key={`${s.heading}-${i}`} aria-labelledby={`sec-${i}`}>
          <h2 id={`sec-${i}`} className="text-lg font-semibold text-slate-100">
            {s.heading} <span className="text-sm font-normal text-slate-400">({s.items.filter((it) => it.depth === 0).length})</span>
          </h2>
          {s.items.length ? (
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              {s.items.map((it, j) => (
                <li key={j} className={`list-disc pl-1 ${INDENT[it.depth] ?? "ml-18"}`}>
                  <InlineText text={it.text} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Nothing listed.</p>
          )}
        </section>
      ))}

      {r && absent.length ? (
        <p className="text-sm text-slate-400">Not in the file: {absent.join(", ")}.</p>
      ) : null}
    </main>
  );
}
