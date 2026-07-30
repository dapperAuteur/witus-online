import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import { getDb } from "@/db";
import { libraryDocuments } from "@/db/schema";

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
  });
  if (!doc) notFound();

  // Content is authored solely by the admin (uploaded via the local sync
  // script) and the page itself sits behind the ADMIN_EMAIL gate, so raw
  // markdown → HTML without a sanitizer is acceptable here.
  const html = await marked.parse(doc.content);

  return (
    <main id="main" className="mx-auto max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3 text-sm">
        <Link
          href="/admin/library"
          className="text-slate-300 hover:text-teal-300"
        >
          ← Library
        </Link>
        <span className="text-xs text-slate-500">
          Updated {dateFmt.format(doc.updatedAt)} UTC
        </span>
      </div>
      <article
        className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-a:text-teal-300 prose-table:block prose-table:overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
