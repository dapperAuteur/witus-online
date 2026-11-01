// Library download formats (lib/library/formats.mjs), behind /admin/library and
// scripts/sync-library.mjs: the ?format= parser, the link builder, and the sibling-file reader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LIBRARY_FORMATS,
  MAX_LIBRARY_FILE_BYTES,
  libraryDownloadHref,
  parseLibraryFormat,
  readSibling,
  siblingPath,
} from "../../lib/library/formats.mjs";

test("missing or empty format means pdf, so old PDF links keep working", () => {
  assert.equal(parseLibraryFormat(null), "pdf");
  assert.equal(parseLibraryFormat(undefined), "pdf");
  assert.equal(parseLibraryFormat(""), "pdf");
  assert.equal(parseLibraryFormat("pdf"), "pdf");
});

test("epub is accepted in any case; anything else is null (the route answers 404)", () => {
  assert.equal(parseLibraryFormat("epub"), "epub");
  assert.equal(parseLibraryFormat("EPUB"), "epub");
  assert.equal(parseLibraryFormat("mobi"), null);
  assert.equal(parseLibraryFormat("pdf\r\nX-Evil: 1"), null);
  assert.equal(parseLibraryFormat("../content"), null);
});

test("each format has the right content type and extension", () => {
  assert.deepEqual(
    { ...LIBRARY_FORMATS.pdf },
    { ext: "pdf", label: "PDF", contentType: "application/pdf" }
  );
  assert.deepEqual(
    { ...LIBRARY_FORMATS.epub },
    { ext: "epub", label: "EPUB", contentType: "application/epub+zip" }
  );
});

test("the PDF link is unchanged; the EPUB link adds ?format=epub", () => {
  assert.equal(
    libraryDownloadHref("heritage-courses-work-list", "pdf"),
    "/admin/library/heritage-courses-work-list/download"
  );
  assert.equal(
    libraryDownloadHref("heritage-courses-work-list", "epub"),
    "/admin/library/heritage-courses-work-list/download?format=epub"
  );
});

test("sibling paths swap only the .md extension", () => {
  assert.equal(
    siblingPath("plans/playbook/2026-11-01-heritage-courses-work-list.md", "epub"),
    "plans/playbook/2026-11-01-heritage-courses-work-list.epub"
  );
  assert.equal(siblingPath("a/b.MD", "pdf"), "a/b.pdf");
});

function reader(files) {
  return (path) => {
    if (path in files) return files[path];
    const err = new Error(`ENOENT: ${path}`);
    err.code = "ENOENT";
    throw err;
  };
}

test("readSibling returns base64 and the decoded size", () => {
  const buf = Buffer.from("PK\u0003\u0004 fake epub");
  const got = readSibling("x/doc.md", "epub", reader({ "x/doc.epub": buf }));
  assert.deepEqual(got, { base64: buf.toString("base64"), bytes: buf.length, path: "x/doc.epub" });
  assert.deepEqual(Buffer.from(got.base64, "base64"), buf);
});

test("readSibling returns null when there is no sibling, so the column is cleared", () => {
  assert.equal(readSibling("x/doc.md", "epub", reader({ "x/doc.pdf": Buffer.from("pdf") })), null);
});

test("readSibling rethrows anything other than a missing file", () => {
  const boom = () => {
    const err = new Error("EACCES");
    err.code = "EACCES";
    throw err;
  };
  assert.throws(() => readSibling("x/doc.md", "epub", boom), /EACCES/);
});

test("files over the cap are refused (Vercel's 4.5 MB response limit)", () => {
  assert.ok(MAX_LIBRARY_FILE_BYTES < 4.5 * 1000 * 1000);
  const atCap = Buffer.alloc(MAX_LIBRARY_FILE_BYTES);
  const over = Buffer.alloc(MAX_LIBRARY_FILE_BYTES + 1);
  assert.equal(readSibling("d.md", "epub", reader({ "d.epub": atCap })).bytes, MAX_LIBRARY_FILE_BYTES);
  assert.deepEqual(readSibling("d.md", "epub", reader({ "d.epub": over })), {
    tooLarge: true,
    bytes: MAX_LIBRARY_FILE_BYTES + 1,
    path: "d.epub",
  });
});

test("migration 0010 adds the two nullable epub columns, additively", () => {
  const sql = readFileSync(new URL("../../db/migrations/0010_library_epub.sql", import.meta.url), "utf8");
  assert.match(sql, /ALTER TABLE "library_document" ADD COLUMN "epub" text;/);
  assert.match(sql, /ALTER TABLE "library_document" ADD COLUMN "epub_bytes" integer;/);
  assert.doesNotMatch(sql, /NOT NULL|DROP/i);
});
