// Operator-task queue: parser, secret filter and "do now" ordering.
//
// Every ecosystem repo keeps the tasks only BAM can do (outside the editor) in a gitignored
// `plans/user-tasks/` folder: `00-descriptions.md` holds an index table with the columns
// `# | Title | Scope | Blocks | Status`, each task is `NN-slug.md`, and closed tasks move to
// `completed/` (Operator-task rule, CLAUDE.md). scripts/sync-user-tasks.mjs reads those folders on
// BAM's machine and uploads the open tasks; /admin/tasks shows them.
//
// The parser is lenient on purpose: the index files are hand-written in ~25 repos. Some have no
// Scope column, some titles carry no link, some links have no `./`, statuses are free text.
//
// Plain JS with no imports so `npm test` (node --test over scripts/lib/*.test.mjs) and the sync
// script can use it without a TypeScript loader. The page imports it too (allowJs).

/**
 * Split one markdown table line into trimmed cells. Escaped pipes (`\|`) and pipes inside inline
 * code stay in the cell.
 * @param {string} line
 * @returns {string[]}
 */
export function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

const SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/**
 * @typedef {{
 *   number: string,
 *   numberInt: number | null,
 *   title: string,
 *   link: string | null,
 *   scope: string,
 *   blocks: string,
 *   status: string,
 * }} IndexRow
 */

/**
 * Every task row in an index file. A table counts when its header has a `#` column and a `Title`
 * (or `Task`) column; columns are matched by header name, so a missing Scope column is fine.
 *
 * Hand-kept indexes drift from strict markdown: rows get separated by blank lines, and new rows
 * get appended below the notes at the end of the file with no header of their own. So once a task
 * table's header has been seen, every later pipe row with a non-empty `#` cell belongs to it,
 * until another table header (task table or not) takes over.
 * @param {string} markdown
 * @returns {IndexRow[]}
 */
export function parseIndexTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  /** @type {IndexRow[]} */
  const rows = [];
  /** @type {{ num: number, title: number, scope: number, blocks: number, status: number } | null} */
  let cols = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|") || SEPARATOR.test(line)) continue;
    if (i + 1 < lines.length && SEPARATOR.test(lines[i + 1].trim())) {
      const header = splitRow(line).map((h) => h.replace(/[*_`]/g, "").trim().toLowerCase());
      const num = header.indexOf("#");
      const title = header.findIndex((h) => h === "title" || h === "task");
      cols =
        num === -1 || title === -1
          ? null
          : {
              num,
              title,
              scope: header.indexOf("scope"),
              blocks: header.findIndex((h) => h.startsWith("blocks")),
              status: header.indexOf("status"),
            };
      i++;
      continue;
    }
    if (!cols) continue;
    const cells = splitRow(line);
    const number = (cells[cols.num] ?? "").replace(/[*_~]/g, "").trim();
    if (!number) continue;
    const rawTitle = cells[cols.title] ?? "";
    const m = rawTitle.match(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
    const title = (m ? m[1] : rawTitle).replace(/[*_]/g, "").trim();
    const link = m ? m[2].replace(/^\.\//, "").trim() : null;
    let decoded = link;
    try {
      decoded = link ? decodeURI(link) : null;
    } catch {
      // A malformed %-escape: keep the link as written.
    }
    rows.push({
      number,
      numberInt: /^\d+/.test(number) ? Number.parseInt(number, 10) : null,
      title,
      link: decoded && !/^[a-z]+:/i.test(decoded) && !decoded.startsWith("#") ? decoded : null,
      scope: cols.scope === -1 ? "" : (cells[cols.scope] ?? ""),
      blocks: cols.blocks === -1 ? "" : (cells[cols.blocks] ?? ""),
      status: cols.status === -1 ? "" : (cells[cols.status] ?? ""),
    });
  }
  return rows;
}

/** Status words that close a task even when its file was never moved to `completed/`. */
const CLOSED_STATUS =
  /^(?:done|closed|complete[d]?|cancel+ed|superseded|obsolete|dropped|retired|won'?t do|not needed|no longer needed|resolved|reference|merged and verified|folded|consolidated|covered by|answered|decided|duplicate|moved to|n\/a)\b/i;

/**
 * True when a status cell says the task is over. Leading emphasis, emoji and strikethrough are
 * ignored, so "**Done 2026-10-29**", "✅ Done" and "done — used X" are closed, while
 * "✅ MERGED — confirm the seed ran" stays open (it still asks for something).
 * @param {string} status
 */
export function isClosedStatus(status) {
  const s = status
    .replace(/[*_`~]/g, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
  return CLOSED_STATUS.test(s);
}

/** `141-admin-tasks.md` → `141`; null for files without a numeric prefix. */
export function fileNumber(name) {
  const m = name.match(/^(\d+)[-_.]/);
  return m ? m[1] : null;
}

/** First `# ` heading, without markdown emphasis. */
export function extractTitle(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[*_`]/g, "").trim() : null;
}

/**
 * The text after a bold label such as `**Blocks:**` or `**Scope:**` in a task body, first line
 * only. For files that are not in their repo's index.
 * @param {string} body
 * @param {string} label
 */
export function extractField(body, label) {
  const re = new RegExp(`^\\s*(?:[-*]\\s*)?\\*\\*${label}:?\\*\\*:?\\s*(.+)$`, "im");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

// ---------------------------------------------------------------------------------------------
// Secret filter
// ---------------------------------------------------------------------------------------------

/** Values that are clearly placeholders, never real credentials. */
const PLACEHOLDER =
  /^(?:<[^>]*>|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|\$\(.*|\[[^\]]*\]|\*+|x{3,}|\.{3}|…|password|passwd|pass|pwd|secret|stub|placeholder|changeme|example|user|test|redacted)$/i;

/** Substrings that mark a long value as a placeholder ("build-check-only-not-a-secret"). */
const PLACEHOLDER_WORD = /(placeholder|example|not-a-secret|stub|changeme|your[-_]|dummy|redacted|xxxx)/i;

/** Three or more lowercase words joined by hyphens: a readable throwaway value, not a generated key. */
const WORD_PHRASE = /^[a-z]+(?:-[a-z]+){2,}$/;

/**
 * Each pattern names an obvious credential shape. The filter refuses the whole file on any match;
 * it never edits a file, so nothing is stripped silently.
 * @type {{ name: string, re: RegExp, value?: (m: RegExpExecArray) => string }[]}
 */
export const SECRET_PATTERNS = [
  {
    name: "connection string with a password",
    re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?):\/\/[^\s:@/'"`]+:([^\s@/'"`]+)@/gi,
    value: (m) => m[1],
  },
  { name: "Stripe-style secret key (sk_/rk_)", re: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: "secret key with sk_ prefix", re: /\bsk_[A-Za-z0-9]{24,}/g },
  { name: "API key with sk- prefix (Anthropic/OpenAI)", re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}/g },
  { name: "Supabase secret key (sb_secret_)", re: /\bsb_secret_[A-Za-z0-9_-]{10,}/g },
  { name: "JWT-looking token", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g },
  { name: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Neon API key", re: /\bnapi_[A-Za-z0-9]{30,}/g },
  { name: "Mailgun API key", re: /\bkey-[0-9a-f]{32}\b/g },
  {
    name: "secret-named variable set to a literal",
    re: /\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*["']?([A-Za-z0-9+/_.=-]{24,})/g,
    value: (m) => m[1],
  },
];

/**
 * Every line of `text` that matches a secret pattern. Returns pattern names and 1-based line
 * numbers only, never the matched value, so the report itself cannot leak.
 * @param {string} text
 * @returns {{ pattern: string, line: number }[]}
 */
export function scanForSecrets(text) {
  /** @type {{ pattern: string, line: number }[]} */
  const hits = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const p of SECRET_PATTERNS) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(line))) {
        const v = p.value ? p.value(m) : m[0];
        if (!PLACEHOLDER.test(v) && !PLACEHOLDER_WORD.test(v) && !WORD_PHRASE.test(v)) {
          hits.push({ pattern: p.name, line: idx + 1 });
          break;
        }
      }
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------------------------
// "Do now" ordering
// ---------------------------------------------------------------------------------------------

/** Tier labels, most urgent first. The tier is the index. */
export const TIERS = /** @type {const} */ ([
  "Security",
  "Broken",
  "Launch or deadline",
  "Blocking",
  "Open",
  "Later",
]);

// Title, scope and status are short and written to be scanned, so single words count there. The
// Blocks cell is often a paragraph explaining the stakes ("the monitor can miss a full outage"),
// so it only counts on stronger phrases.
const SECURITY_WORDS =
  /(?:\b(?:urgent|security|vulnerab\w*|critical|cve-\d+|ghsa-[a-z0-9-]+|leak(?:ed|s)?|compromis\w*|rotate|breach\w*|do first)\b|🔴)/i;
const SECURITY_BLOCKS =
  /\b(?:security (?:fix|patch|flaw|hole|issue|branch\w*)|vulnerab\w*|cve-\d+|ghsa-[a-z0-9-]+|leak(?:ed|s|ing)?\b|compromis\w*|critical [\w\s-]{0,40}(?:flaw|fix|bug|vulnerab\w*)|sign-in-as-anyone|exposed (?:secret|key|token|password)s?|urgent)/i;
const BROKEN_WORDS =
  /\b(?:fail(?:ed|ing|s|ure)?|broken|outage|down|[45]\d\ds?|not live|still runs|not deploying)\b/i;
const BROKEN_BLOCKS =
  /\b(?:(?:production|prod|site|deploy\w*|build) (?:is |has |was )?(?:down|broken|failing|failed)|fail(?:ed|s|ing) (?:on|in) (?:production|prod)|(?:answers?|answering|returns?|returning) (?:a )?[45]\d\d|[45]\d\ds? (?:on|in) (?:every|prod\w*)|breaks? (?:sign-in|every|production|the site))/i;
const LAUNCH_WORDS =
  /\b(?:launch\w*|deadline|due|go-live|expires?|expiring|by (?:mon|tue|wed|thu|fri|sat|sun)\w*|by (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|by \d{4}-\d{2}-\d{2})\b/i;
const LAUNCH_BLOCKS =
  /\b(?:blocks? [\w\s.'-]{0,50}launch\w*|deadline|due (?:on|by)|by (?:mon|tue|wed|thu|fri|sat|sun)\w*|by (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w* \d|expires? (?:on|in))\b/i;
const LATER_RE =
  /\b(?:parked|later|optional|someday|on hold|deferred|backlog|nice to have|no deadline|whenever|intentionally held)\b/i;
const NOT_BLOCKING_RE = /^(?:(?:nothing|none|n\/a)\b|[—–-]\s*$)/i;

/** Remove markdown emphasis and code ticks so the patterns see plain words. */
function plain(s) {
  return (s ?? "").replace(/[*_`~]/g, " ");
}

/**
 * How urgent a task looks from its index text. A heuristic for ordering only; BAM decides.
 *   0 Security  urgent/security/critical/leak/rotate in title, scope or status, or a strong
 *               security phrase in Blocks ("security fix", "GHSA-", "leaked")
 *   1 Broken    title or status says failed/broken/down/5xx, or Blocks says production is broken
 *   2 Launch    a launch, deadline or due date in title or status, or "blocks ... launch" in Blocks
 *   3 Blocking  the Blocks cell names something
 *   4 Open      everything else
 *   5 Later     status says parked/optional/later (never overrides Security)
 * @param {{ title?: string, scope?: string, blocks?: string, status?: string }} t
 * @returns {{ tier: number, label: string }}
 */
export function taskPriority(t) {
  const title = plain(t.title);
  const scope = plain(t.scope);
  const blocks = plain(t.blocks).trim();
  const status = plain(t.status);
  const pick = (/** @type {number} */ tier) => ({ tier, label: TIERS[tier] });
  const short = `${title} ${scope} ${status}`;
  if (SECURITY_WORDS.test(short) || SECURITY_BLOCKS.test(blocks)) return pick(0);
  if (LATER_RE.test(status)) return pick(5);
  if (BROKEN_WORDS.test(`${title} ${status}`) || BROKEN_BLOCKS.test(blocks)) return pick(1);
  if (LAUNCH_WORDS.test(`${title} ${status}`) || LAUNCH_BLOCKS.test(blocks)) return pick(2);
  if (blocks.length >= 3 && !NOT_BLOCKING_RE.test(blocks)) return pick(3);
  return pick(4);
}

/**
 * Sort tasks by tier, then task number (lowest first: the oldest ask), then title.
 * @template {{ title: string, scope?: string, blocks?: string, status?: string, numberInt?: number | null }} T
 * @param {T[]} tasks
 * @returns {(T & { tier: number, tierLabel: string })[]}
 */
export function sortTasks(tasks) {
  return tasks
    .map((t) => {
      const p = taskPriority(t);
      return { ...t, tier: p.tier, tierLabel: p.label };
    })
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (a.numberInt ?? Number.MAX_SAFE_INTEGER) - (b.numberInt ?? Number.MAX_SAFE_INTEGER) ||
        a.title.localeCompare(b.title),
    );
}

/**
 * Group tasks by app, each group sorted with sortTasks, groups ordered by their most urgent task,
 * then by how many urgent (tier < 4) tasks they hold, then by name.
 * @template {{ app: string, appName: string, title: string, scope?: string, blocks?: string, status?: string, numberInt?: number | null }} T
 * @param {T[]} tasks
 */
export function groupByApp(tasks) {
  /** @type {Map<string, T[]>} */
  const byApp = new Map();
  for (const t of tasks) {
    const list = byApp.get(t.app) ?? [];
    list.push(t);
    byApp.set(t.app, list);
  }
  const groups = [...byApp.entries()].map(([app, list]) => {
    const sorted = sortTasks(list);
    return {
      app,
      appName: sorted[0]?.appName ?? app,
      tasks: sorted,
      topTier: sorted[0]?.tier ?? TIERS.length,
      urgent: sorted.filter((t) => t.tier < 4).length,
    };
  });
  return groups.sort(
    (a, b) => a.topTier - b.topTier || b.urgent - a.urgent || a.appName.localeCompare(b.appName),
  );
}
