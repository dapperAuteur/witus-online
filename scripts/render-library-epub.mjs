#!/usr/bin/env node
// render-library-epub.mjs — render plans/playbook markdown into EPUB 3 files for an e-reader.
//
//   npm run library:epub -- plans/playbook/<file>.md [more.md ...]   # writes <file>.epub beside each source
//   npm run library:epub -- --all                                    # re-render every .epub older than its .md
//
// WHY THIS EXISTS (2026-10-27): BAM reads the library's ebooks on an e-reader. PDFs are fixed-page and
// read badly on a 6-inch screen; EPUB reflows. pandoc writes clean EPUB 3 (nav document, NCX for older
// readers, one file per part), so this script resolves a pandoc binary and drives it instead of hand-rolling
// the zip. `--all` refreshes only EPUBs that already exist, so the library doesn't grow an EPUB per document
// unless someone asks for one.
//
// Resolving pandoc (nothing is installed system-wide on BAM's Intel Mac, where Homebrew has no bottles for
// macOS 13): LIBRARY_EPUB_PANDOC env → `pandoc` on PATH → the binary bundled in the `pypandoc_binary` Python
// package, fetched into uv's cache by `uv run --no-project --with pypandoc_binary` (uv on PATH or in
// ~/.local/bin). If none works, the script says so and exits 1.
//
// Markdown dialect: GitHub-flavored, with pandoc's TeX math turned OFF, because the ebooks are full of dollar
// amounts ("$25,000 ... $2,150,000") that pandoc would otherwise read as math. The first H1 becomes the book
// title (--shift-heading-level-by=-1) and each H2 starts a new section file.
//
// DEV-TIME only: plans/ is gitignored; EPUBs land beside their sources. Copy one to the e-reader by USB or
// a send-to-device email.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PLAYBOOK = join(ROOT, "plans", "playbook");
const CSS = join(ROOT, "scripts", "library-epub.css");

function works(bin) {
  const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function resolvePandoc() {
  const fromEnv = process.env.LIBRARY_EPUB_PANDOC;
  if (fromEnv) {
    if (works(fromEnv)) return fromEnv;
    throw new Error(`LIBRARY_EPUB_PANDOC=${fromEnv} does not run`);
  }
  if (works("pandoc")) return "pandoc";
  const uvCandidates = ["uv", join(homedir(), ".local", "bin", "uv")];
  for (const uv of uvCandidates) {
    if (!works(uv)) continue;
    const r = spawnSync(
      uv,
      ["run", "--no-project", "--with", "pypandoc_binary", "python", "-c", "import pypandoc; print(pypandoc.get_pandoc_path())"],
      { encoding: "utf8" },
    );
    const path = r.stdout.trim().split("\n").pop();
    if (r.status === 0 && path && works(path)) return path;
  }
  throw new Error(
    "no pandoc found. Install uv (https://docs.astral.sh/uv/getting-started/installation/) or pandoc, " +
      "or set LIBRARY_EPUB_PANDOC to a pandoc binary.",
  );
}

function render(pandoc, mdPath) {
  const src = resolve(mdPath);
  if (!existsSync(src) || !src.endsWith(".md")) throw new Error(`not a markdown file: ${mdPath}`);
  const out = src.replace(/\.md$/, ".epub");
  const date = basename(src).match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
  const args = [
    src,
    "--from=gfm-tex_math_dollars-tex_math_gfm",
    "--to=epub3",
    `--output=${out}`,
    "--shift-heading-level-by=-1",
    "--toc",
    "--toc-depth=2",
    "--split-level=1",
    `--css=${CSS}`,
    "--metadata=author:WitUS Library",
    "--metadata=lang:en-US",
    ...(date ? [`--metadata=date:${date}`] : []),
  ];
  const r = spawnSync(pandoc, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`pandoc failed on ${mdPath}:\n${r.stderr}`);
  if (r.stderr.trim()) process.stderr.write(r.stderr);
  console.log(`epub: ${out}`);
}

function staleEpubs() {
  return readdirSync(PLAYBOOK)
    .filter((f) => f.endsWith(".epub"))
    .map((f) => join(PLAYBOOK, f.replace(/\.epub$/, ".md")))
    .filter((md) => existsSync(md) && statSync(md).mtimeMs > statSync(md.replace(/\.md$/, ".epub")).mtimeMs);
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("usage: npm run library:epub -- <file.md> [...] | --all");
  process.exit(1);
}
try {
  const files = argv.includes("--all") ? staleEpubs() : argv;
  if (files.length === 0) {
    console.log("epub: nothing to render (every existing .epub is newer than its .md)");
    process.exit(0);
  }
  const pandoc = resolvePandoc();
  for (const f of files) render(pandoc, f);
} catch (error) {
  console.error(`epub: ${error.message}`);
  process.exit(1);
}
