// Ecosystem roadmap file format: parser and staleness rule.
//
// Every ecosystem app keeps a tracked `docs/roadmap.md` in its own repo (apps without a repo keep
// `docs/roadmaps/<slug>.md` in this repo). The format, and the rule that keeps it current, live in
// docs/shared-rules.md ("Roadmap rule"):
//
//   ---
//   app: <slug>
//   name: <display name>
//   stage: idea | vetted | building | beta | live | paused | retired
//   url: <optional>
//   updated: YYYY-MM-DD
//   ---
//   ## Live now / ## In progress / ## Next / ## Backlog / ## Blocked on
//
// The parser is lenient on purpose: these files are hand-written in ~25 repos. Unknown headings are
// kept as-is, missing sections are fine, and bad frontmatter comes back as `errors` (the page shows
// an error card) instead of throwing.
//
// Plain JS (allowJs) with no imports so `npm test` (node --test over scripts/lib/*.test.mjs) can
// exercise it without a TypeScript loader. Server fetch lives in lib/roadmap/github.ts.

/** Allowed `stage` values, in lifecycle order. */
export const STAGES = /** @type {const} */ ([
  "idea",
  "vetted",
  "building",
  "beta",
  "live",
  "paused",
  "retired",
]);

/** The five standard sections: heading text (matched case-insensitively) to key. */
export const KNOWN_SECTIONS = /** @type {const} */ ({
  "live now": "live",
  "in progress": "inProgress",
  next: "next",
  backlog: "backlog",
  "blocked on": "blocked",
});

/** Days main may run ahead of the roadmap file's last commit before the page flags it. */
export const STALE_AFTER_DAYS = 14;

// A seeded file often says "- None yet" under an empty heading. Counting that as one item would
// make an app look busier (or more blocked) than it is.
const PLACEHOLDER_ITEM = /^(none|none yet|nothing|nothing yet|n\/a|tbd|-)\.?$/i;

/**
 * @typedef {{ text: string, depth: number }} RoadmapItem
 * @typedef {{ key: string | null, heading: string, items: RoadmapItem[] }} RoadmapSection
 * @typedef {{
 *   app: string | null,
 *   name: string | null,
 *   stage: string | null,
 *   url: string | null,
 *   updated: string | null,
 *   extra: Record<string, string>,
 * }} RoadmapMeta
 * @typedef {{
 *   ok: boolean,
 *   meta: RoadmapMeta,
 *   sections: RoadmapSection[],
 *   errors: string[],
 *   warnings: string[],
 * }} ParsedRoadmap
 */

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function unquote(v) {
  const t = v.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Split off and parse the `---` frontmatter. Only flat `key: value` lines are supported, which is
 * all the format uses; anything else is reported, not guessed at.
 *
 * @param {string[]} lines
 * @returns {{ meta: RoadmapMeta, bodyStart: number, errors: string[], warnings: string[] }}
 */
function parseFrontmatter(lines) {
  /** @type {RoadmapMeta} */
  const meta = { app: null, name: null, stage: null, url: null, updated: null, extra: {} };
  const errors = [];
  const warnings = [];

  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || lines[i].trim() !== "---") {
    errors.push("No frontmatter: the file must start with a `---` block (app, name, stage, updated).");
    return { meta, bodyStart: 0, errors, warnings };
  }
  const start = i + 1;
  let end = -1;
  for (let j = start; j < lines.length; j++) {
    if (lines[j].trim() === "---") {
      end = j;
      break;
    }
  }
  if (end === -1) {
    errors.push("Frontmatter is not closed: add a second `---` line after the fields.");
    return { meta, bodyStart: 0, errors, warnings };
  }

  for (let j = start; j < end; j++) {
    const raw = lines[j];
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const m = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(raw.trim());
    if (!m) {
      errors.push(`Frontmatter line ${j + 1} is not "key: value": ${raw.trim()}`);
      continue;
    }
    const key = m[1].toLowerCase();
    const value = unquote(m[2]);
    if (key === "app" || key === "name" || key === "stage" || key === "url" || key === "updated") {
      meta[key] = value === "" ? null : value;
    } else {
      meta.extra[key] = value;
    }
  }

  if (!meta.app) errors.push("Frontmatter is missing `app` (the app's slug).");
  if (!meta.name) errors.push("Frontmatter is missing `name`.");
  if (!meta.stage) {
    errors.push(`Frontmatter is missing \`stage\` (one of: ${STAGES.join(", ")}).`);
  } else {
    const s = meta.stage.toLowerCase();
    if (!STAGES.includes(/** @type {never} */ (s))) {
      errors.push(`Unknown stage "${meta.stage}" (expected one of: ${STAGES.join(", ")}).`);
    } else {
      meta.stage = s;
    }
  }
  if (!meta.updated) {
    errors.push("Frontmatter is missing `updated` (YYYY-MM-DD).");
  } else if (!isIsoDate(meta.updated)) {
    errors.push(`\`updated\` is not a YYYY-MM-DD date: "${meta.updated}".`);
  }
  if (meta.url && !/^https?:\/\//i.test(meta.url)) {
    warnings.push(`\`url\` does not start with http(s)://, so it is not linked: "${meta.url}".`);
  }

  return { meta, bodyStart: end + 1, errors, warnings };
}

/**
 * Parse a roadmap file. Never throws.
 *
 * @param {string} text the raw markdown
 * @returns {ParsedRoadmap}
 */
export function parseRoadmap(text) {
  const lines = String(text ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const { meta, bodyStart, errors, warnings } = parseFrontmatter(lines);

  /** @type {RoadmapSection[]} */
  const sections = [];
  /** @type {RoadmapSection | null} */
  let current = null;
  let inFence = false;
  const seen = new Set();

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const h2 = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (h2 && !line.startsWith("###")) {
      const heading = h2[1].trim();
      const norm = heading.toLowerCase().replace(/[:.]+$/, "").trim();
      const key = Object.prototype.hasOwnProperty.call(KNOWN_SECTIONS, norm)
        ? KNOWN_SECTIONS[/** @type {keyof typeof KNOWN_SECTIONS} */ (norm)]
        : null;
      if (key && seen.has(key)) warnings.push(`"${heading}" appears more than once; the items are merged.`);
      const existing = key ? sections.find((s) => s.key === key) : null;
      if (existing) {
        current = existing;
      } else {
        current = { key, heading, items: [] };
        sections.push(current);
      }
      if (key) seen.add(key);
      continue;
    }
    if (/^#\s/.test(line)) continue; // a document title; the frontmatter name is what we show
    if (!current) continue; // prose before the first section is ignored

    if (line.trim() === "") continue;
    const h3 = /^#{3,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (h3) {
      current.items.push({ text: h3[1].trim(), depth: 0 });
      continue;
    }
    const bullet = /^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(line);
    if (bullet) {
      const indent = bullet[1].replace(/\t/g, "  ").length;
      const textValue = bullet[2].trim();
      if (textValue === "" || PLACEHOLDER_ITEM.test(textValue)) continue;
      current.items.push({ text: textValue, depth: Math.min(3, Math.floor(indent / 2)) });
      continue;
    }
    // A wrapped continuation line belongs to the item above it; a loose paragraph is its own item.
    const last = current.items.at(-1);
    if (last && /^\s+\S/.test(line)) {
      last.text = `${last.text} ${line.trim()}`;
    } else if (!PLACEHOLDER_ITEM.test(line.trim())) {
      current.items.push({ text: line.trim(), depth: 0 });
    }
  }

  return { ok: errors.length === 0, meta, sections, errors, warnings };
}

/**
 * The items under one of the five standard sections (empty when the section is absent).
 *
 * @param {ParsedRoadmap} roadmap
 * @param {"live" | "inProgress" | "next" | "backlog" | "blocked"} key
 * @returns {RoadmapItem[]}
 */
export function sectionItems(roadmap, key) {
  return roadmap.sections.find((s) => s.key === key)?.items ?? [];
}

/** Top-level items only: nested bullets are detail under an item, not separate work. */
export function countTopLevel(items) {
  return items.filter((i) => i.depth === 0).length;
}

/**
 * Staleness rule: the roadmap "may be stale" when the repo's latest commit on main is more than
 * `days` days newer than the latest commit that touched the roadmap file. Returns null (unknown)
 * when either date is missing or unparseable.
 *
 * @param {string | Date | null | undefined} roadmapCommitDate last commit touching the roadmap file
 * @param {string | Date | null | undefined} mainCommitDate latest commit on the app repo's main
 * @param {number} [days]
 * @returns {boolean | null}
 */
export function isRoadmapStale(roadmapCommitDate, mainCommitDate, days = STALE_AFTER_DAYS) {
  if (!roadmapCommitDate || !mainCommitDate) return null;
  const r = new Date(roadmapCommitDate).getTime();
  const m = new Date(mainCommitDate).getTime();
  if (Number.isNaN(r) || Number.isNaN(m)) return null;
  return m - r > days * 24 * 60 * 60 * 1000;
}

/**
 * Whether a roadmap's `app` slug names this registry entry (its slug or one of its aliases).
 *
 * @param {string | null} declared
 * @param {string} slug
 * @param {readonly string[]} [aliases]
 */
export function appSlugMatches(declared, slug, aliases = []) {
  if (!declared) return false;
  const d = declared.trim().toLowerCase();
  return d === slug.toLowerCase() || aliases.some((a) => a.toLowerCase() === d);
}
