// Download formats for the private library (/admin/library): which stored file each format serves,
// its Content-Type, and the size cap the sync script enforces.
//
// Plain JS (allowJs) with no imports so `npm test` (node --test over scripts/lib/*.test.mjs) and
// scripts/sync-library.mjs (plain node) can load it, while the download route and pages import it
// through "@/lib/library/formats.mjs".

/**
 * Every downloadable copy of a library document. `pdf` is the default and keeps the original URL
 * (/admin/library/<slug>/download); `epub` is the same route with `?format=epub`, for the e-reader.
 */
export const LIBRARY_FORMATS = Object.freeze({
  pdf: Object.freeze({ ext: "pdf", label: "PDF", contentType: "application/pdf" }),
  epub: Object.freeze({ ext: "epub", label: "EPUB", contentType: "application/epub+zip" }),
});

/**
 * Vercel caps a function's response body at 4.5 MB, and the download route sends the whole file in
 * one response. The sync script refuses to store a file larger than this (4 MiB, decoded), so a
 * stored file always fits with room for headers. A refused file is reported and its column cleared,
 * exactly as if there were no sibling file.
 */
export const MAX_LIBRARY_FILE_BYTES = 4 * 1024 * 1024;

/**
 * Reads `?format=` on the download route. Missing or empty means "pdf" (the URL the PDF links have
 * always used); any value that is not a known format returns null, which the route answers with 404.
 * @param {string | null | undefined} value
 * @returns {"pdf" | "epub" | null}
 */
export function parseLibraryFormat(value) {
  if (value == null || value === "") return "pdf";
  const v = String(value).toLowerCase();
  return v === "pdf" || v === "epub" ? v : null;
}

/**
 * The download link for one document in one format.
 * @param {string} slug
 * @param {"pdf" | "epub"} format
 */
export function libraryDownloadHref(slug, format) {
  const base = `/admin/library/${encodeURIComponent(slug)}/download`;
  return format === "pdf" ? base : `${base}?format=${format}`;
}

/**
 * The sibling file of a markdown source: `notes/2026-11-01-x.md` -> `notes/2026-11-01-x.epub`.
 * @param {string} markdownPath
 * @param {"pdf" | "epub"} format
 */
export function siblingPath(markdownPath, format) {
  return markdownPath.replace(/\.md$/i, `.${LIBRARY_FORMATS[format].ext}`);
}

/**
 * Loads the sibling file for the sync script.
 *   - no file: null (the column is cleared);
 *   - over MAX_LIBRARY_FILE_BYTES: { tooLarge: true, bytes, path } (not stored; column cleared);
 *   - otherwise: { base64, bytes, path }.
 * `readFile` is injectable for tests; it must throw an error with code "ENOENT" for a missing file.
 * @param {string} markdownPath
 * @param {"pdf" | "epub"} format
 * @param {(path: string) => Buffer} readFile
 */
export function readSibling(markdownPath, format, readFile) {
  const path = siblingPath(markdownPath, format);
  let buf;
  try {
    buf = readFile(path);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw err;
  }
  if (buf.length > MAX_LIBRARY_FILE_BYTES) return { tooLarge: true, bytes: buf.length, path };
  return { base64: buf.toString("base64"), bytes: buf.length, path };
}
