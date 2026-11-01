import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { libraryDocuments } from "@/db/schema";
import { isAdminRequest } from "@/lib/admin-auth";
import { LIBRARY_FORMATS, parseLibraryFormat } from "@/lib/library/formats.mjs";

/**
 * Streams the stored PDF (default) or EPUB (`?format=epub`) for one library
 * document. Any other `format` value is a 404, like a missing file.
 *
 * GATING: app/admin/layout.tsx gates the library PAGES, but layouts do not run
 * for route handlers, so this file repeats the owner check through the shared
 * helper in lib/admin-auth.ts. Without that, the layout's 403 screen would look
 * like protection while this route served every ebook to anyone who guessed the
 * URL.
 *
 * A caller who is not the owner gets 404, not 403: a 403 would confirm that a
 * document with that slug exists, and the slugs are guessable (they come from
 * the source filenames). Missing document and missing PDF return the same 404
 * for the same reason.
 */

// Never cached, at any layer. The response body is private content behind a
// session check, so a CDN or Data Cache copy is a leak waiting to happen.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** Fresh instance per call: a Response body is a stream and cannot be reused. */
function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}

/** Keeps a slug from smuggling CR/LF or quotes into the Content-Disposition header. */
function safeFilename(slug: string): string {
  const cleaned = slug.replace(/[^a-z0-9._-]/gi, "-").slice(0, 100);
  return cleaned.length > 0 ? cleaned : "document";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  if (!(await isAdminRequest())) return notFound();

  const format = parseLibraryFormat(new URL(request.url).searchParams.get("format"));
  if (!format) return notFound();
  const { ext, contentType } = LIBRARY_FORMATS[format];

  const { slug } = await params;
  const db = getDb();
  // Select only the payload this request serves, never both.
  const [doc] = await db
    .select({
      slug: libraryDocuments.slug,
      file: format === "epub" ? libraryDocuments.epub : libraryDocuments.pdf,
    })
    .from(libraryDocuments)
    .where(eq(libraryDocuments.slug, slug))
    .limit(1);

  if (!doc?.file) return notFound();

  // Stored base64 (see db/schema.ts for why base64 and not bytea). The sync
  // script caps each file at 4 MiB, under Vercel's 4.5 MB response limit.
  const bytes = Uint8Array.from(Buffer.from(doc.file, "base64"));

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename(doc.slug)}.${ext}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
