import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { marked } from "marked";
import { getDb } from "@/db";
import { libraryDocuments } from "@/db/schema";
import { formatBytes } from "@/lib/format-bytes";
import { libraryDownloadHref } from "@/lib/library/formats.mjs";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function LibraryDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const doc = await db.query.libraryDocuments.findFirst({
    where: eq(libraryDocuments.slug, slug),
    // `pdf: false` and `epub: false` matter: each column holds up to a few
    // megabytes of base64 and the reader never needs the bytes, only whether the
    // download links belong here. The bytes are fetched by the download route
    // and nowhere else.
    columns: { pdf: false, epub: false },
    extras: {
      hasPdf: sql<boolean>`${libraryDocuments.pdf} is not null`.as("has_pdf"),
      hasEpub: sql<boolean>`${libraryDocuments.epub} is not null`.as("has_epub"),
    },
  });
  if (!doc) notFound();

  // Content is authored solely by the admin (uploaded via the local sync
  // script) and the page itself sits behind the ADMIN_EMAIL gate, so raw
  // markdown → HTML without a sanitizer is acceptable here.
  const html = await marked.parse(doc.content);
  const size = doc.hasPdf ? formatBytes(doc.pdfBytes) : null;
  const epubSize = doc.hasEpub ? formatBytes(doc.epubBytes) : null;
  // 44px tall (min-h-11): the touch-target floor in docs/shared-ui-ux-dx.md.
  const buttonClass =
    "inline-flex min-h-11 items-center rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-teal-400 hover:text-teal-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

  return (
    <main id="main" className="mx-auto max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link
          href="/admin/library"
          className="text-slate-300 hover:text-teal-300"
        >
          ← Library
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {doc.hasPdf ? (
            <a href={libraryDownloadHref(doc.slug, "pdf")} className={buttonClass}>
              Download PDF{size ? ` (${size})` : ""}
            </a>
          ) : null}
          {doc.hasEpub ? (
            <a href={libraryDownloadHref(doc.slug, "epub")} className={buttonClass}>
              Download EPUB{epubSize ? ` (${epubSize})` : ""}
            </a>
          ) : null}
          <span className="text-xs text-slate-500">
            Updated {dateFmt.format(doc.updatedAt)} UTC
          </span>
        </div>
      </div>
      <article
        className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-a:text-teal-300 prose-table:block prose-table:overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
