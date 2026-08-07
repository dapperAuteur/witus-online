import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { libraryDocuments } from "@/db/schema";
import { formatBytes } from "@/lib/format-bytes";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export default async function LibraryListPage() {
  const db = getDb();
  const docs = await db
    .select({
      slug: libraryDocuments.slug,
      title: libraryDocuments.title,
      description: libraryDocuments.description,
      updatedAt: libraryDocuments.updatedAt,
      // Never select `pdf` here. It is a base64 payload of up to a megabyte per
      // row, and the list only needs to know whether one is there.
      hasPdf: sql<boolean>`${libraryDocuments.pdf} is not null`,
      pdfBytes: libraryDocuments.pdfBytes,
    })
    .from(libraryDocuments)
    .orderBy(asc(libraryDocuments.sortOrder), asc(libraryDocuments.title));

  return (
    <main id="main" className="mx-auto max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Library
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Private long-form documents: interview prep, playbook, per-app
          chapters. Synced from local markdown via{" "}
          <span className="font-mono">scripts/sync-library.mjs</span>, which also
          uploads the sibling PDF when there is one.
        </p>
      </header>

      {docs.length === 0 ? (
        <p className="rounded-lg border border-slate-800 px-4 py-6 text-sm text-slate-400">
          Nothing here yet. Run{" "}
          <span className="font-mono">
            node scripts/sync-library.mjs plans/playbook/*.md
          </span>{" "}
          from the repo root to upload the ebooks.
        </p>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => {
            const size = doc.hasPdf ? formatBytes(doc.pdfBytes) : null;
            return (
              <li
                key={doc.slug}
                className="rounded-lg border border-slate-800 transition-colors hover:border-teal-400 focus-within:border-teal-400"
              >
                <Link
                  href={`/admin/library/${doc.slug}`}
                  className="block px-4 py-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                >
                  <span className="block font-semibold text-slate-100">
                    {doc.title}
                  </span>
                  {doc.description ? (
                    <span className="mt-1 block text-sm text-slate-400">
                      {doc.description}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-slate-500">
                    Updated {dateFmt.format(doc.updatedAt)}
                  </span>
                </Link>
                {doc.hasPdf ? (
                  <div className="border-t border-slate-800 px-4 py-2">
                    <a
                      href={`/admin/library/${doc.slug}/download`}
                      className="inline-flex min-h-9 items-center rounded-md px-1 text-xs font-semibold text-teal-300 hover:text-teal-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                    >
                      Download PDF{size ? ` (${size})` : ""}
                    </a>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
