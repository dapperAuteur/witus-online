#!/usr/bin/env node
/**
 * Upsert local markdown files into the private library (library_document),
 * readable at /admin/library. Content intentionally never touches git — this
 * repo is public; the library holds internal ebooks (interview prep, playbook).
 *
 * Usage (from repo root, .env.local must provide a database URL):
 *   node scripts/sync-library.mjs plans/playbook/2026-05-03-bam-public-narrative-prep.md [more.md ...]
 *
 * Slug = filename without extension and without a leading YYYY-MM-DD- prefix.
 * Title = first `# ` heading (falls back to the slug).
 * Sort order = position in the argument list.
 * PDF = the sibling `<same-name>.pdf`, if one sits next to the markdown. It is
 *   stored base64 encoded (see db/schema.ts for why base64 and not bytea) and
 *   served by /admin/library/<slug>/download. No sibling file means the column
 *   is cleared, so deleting a stale PDF locally removes it here on the next run.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const dbUrl =
  process.env.STORAGE_DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.STORAGE_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(
    "No database URL found (STORAGE_DATABASE_URL / DATABASE_URL, or their _UNPOOLED variants)."
  );
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/sync-library.mjs <markdown files...>");
  process.exit(1);
}

function slugFor(file) {
  return basename(file)
    .replace(/\.md$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .toLowerCase();
}

function titleFor(content, slug) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[*_`]/g, "").trim() : slug;
}

function descriptionFor(content) {
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith(">") || t.startsWith("---"))
      continue;
    const plain = t.replace(/[*_`>#\[\]]/g, "").trim();
    if (plain.length < 10) continue;
    return plain.length > 200 ? `${plain.slice(0, 197)}...` : plain;
  }
  return null;
}

/** Reads the sibling `<markdown path minus .md>.pdf`, or null when there is none. */
function pdfFor(file) {
  const path = file.replace(/\.md$/i, ".pdf");
  try {
    const buf = readFileSync(path);
    return { base64: buf.toString("base64"), bytes: buf.length, path };
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

const sql = neon(dbUrl);

let order = 0;
for (const file of files) {
  const content = readFileSync(file, "utf8");
  const slug = slugFor(file);
  const title = titleFor(content, slug);
  const description = descriptionFor(content);
  const pdf = pdfFor(file);
  order += 10;
  await sql`
    INSERT INTO library_document (slug, title, description, content, pdf, pdf_bytes, sort_order, updated_at)
    VALUES (${slug}, ${title}, ${description}, ${content}, ${pdf?.base64 ?? null}, ${pdf?.bytes ?? null}, ${order}, now())
    ON CONFLICT (slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      content = excluded.content,
      pdf = excluded.pdf,
      pdf_bytes = excluded.pdf_bytes,
      sort_order = excluded.sort_order,
      updated_at = now()
  `;
  const pdfNote = pdf
    ? `+ pdf ${basename(pdf.path)} (${pdf.bytes}B)`
    : "no sibling pdf";
  console.log(`upserted ${slug}  (${title})  ${pdfNote}`);
}

const rows = await sql`
  SELECT slug, title, length(content) AS bytes, pdf_bytes, sort_order, updated_at
  FROM library_document ORDER BY sort_order, title
`;
console.log("\nlibrary_document now contains:");
for (const r of rows) {
  const pdfCol = r.pdf_bytes == null ? "no pdf" : `pdf ${r.pdf_bytes}B`;
  console.log(
    `  ${String(r.sort_order).padStart(3)}  ${r.slug}  ${r.bytes}B  ${pdfCol}  ${r.updated_at.toISOString?.() ?? r.updated_at}`
  );
}
