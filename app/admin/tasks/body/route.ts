import { NextResponse, type NextRequest } from "next/server";
import { marked } from "marked";
import { getDb } from "@/db";
import { isAdminRequest } from "@/lib/admin-auth";
import { loadTaskBody } from "@/lib/operator-tasks/queries";

// One task's rendered markdown and full index cells, fetched when a row on /admin/tasks is opened.
// The whole queue is several megabytes of markdown, too much to put in one phone page. A layout
// does not run for a route handler, so this repeats the owner check (lib/admin-auth.ts).

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Not authorized.", code: "forbidden" }, { status: 403, headers: NO_STORE });
  }
  const key = request.nextUrl.searchParams.get("key");
  if (!key || key.length > 600) {
    return NextResponse.json({ ok: false, error: "Missing task.", code: "bad_request" }, { status: 400, headers: NO_STORE });
  }
  const row = await loadTaskBody(getDb(), key);
  if (!row) {
    return NextResponse.json({ ok: false, error: "This task is no longer synced.", code: "not_found" }, { status: 404, headers: NO_STORE });
  }
  // Task files are written by BAM and Claude on BAM's machine, uploaded by the local sync script
  // (which refuses files that match secret patterns), and served only to ADMIN_EMAIL, so raw
  // markdown to HTML without a sanitizer is acceptable here, as on /admin/library.
  const html = row.body ? await marked.parse(row.body) : null;
  const inline = (md: string) => (md ? (marked.parseInline(md, { async: false }) as string) : "");
  const cells = { scope: inline(row.scope), blocks: inline(row.blocks), status: inline(row.status) };
  return NextResponse.json(
    { ok: true, data: { html, cells, withheld: row.bodyWithheld, file: row.file, repoPath: row.repoPath } },
    { headers: NO_STORE },
  );
}
