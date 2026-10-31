// Read one repo's plans/user-tasks/ folder into upload-ready task rows. Node-only (node:fs); used
// by scripts/sync-user-tasks.mjs and its tests, never by the Next app.
//
// What counts as an open task:
//   - an index row (00-descriptions.md) whose file sits in the folder root, or that has no file,
//     and whose Status does not say done/closed (isClosedStatus);
//   - a numbered task file in the folder root that the index does not list (flagged `unindexed`).
// Closed: the row links into completed/, its file only exists in completed/, or its status says
// done. A done task whose file is still in the root is listed in `doneInRoot` (the rule allows
// leaving it, so it is a tidy-up note, not an error) and not uploaded. A row whose linked file is
// gone from both places was closed by deleting the file (also allowed by the rule): `gone`.
//
// Secret filter: the row's own text and the file are scanned with scanForSecrets. A row whose index
// text matches is skipped entirely; a file that matches keeps its row but the body is not uploaded,
// and `bodyWithheld` names the pattern and line. Nothing is ever edited or stripped.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import {
  extractField,
  extractTitle,
  fileNumber,
  isClosedStatus,
  parseIndexTable,
  scanForSecrets,
} from "../../lib/operator-tasks/core.mjs";

const TASK_FILE = /^\d+[-_.].*\.(md|sh)$/i;

/** "07" and "7" are the same task number. */
function sameNumber(a, b) {
  return a != null && b != null && a.replace(/^0+(?=\d)/, "") === b.replace(/^0+(?=\d)/, "");
}

function listFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function readBody(dir, file) {
  const raw = readFileSync(join(dir, file), "utf8");
  return file.toLowerCase().endsWith(".sh") ? `# ${file}\n\n\`\`\`sh\n${raw}\n\`\`\`\n` : raw;
}

function describeHits(hits) {
  const first = hits[0];
  const more = hits.length > 1 ? ` (+${hits.length - 1} more)` : "";
  return `secret pattern: ${first.pattern}, line ${first.line}${more}`;
}

/**
 * @typedef {{
 *   key: string, app: string, appName: string, repoPath: string,
 *   number: string | null, numberInt: number | null, file: string | null,
 *   title: string, scope: string, blocks: string, status: string,
 *   body: string | null, bodyWithheld: string | null, unindexed: boolean,
 *   sourceUpdatedAt: string | null,
 * }} TaskRow
 */

/**
 * @param {string} repoPath absolute repo path
 * @param {{ app: string, appName: string }} ident
 * @returns {{
 *   skipped: string | null,
 *   hasIndex: boolean,
 *   tasks: TaskRow[],
 *   withheld: { where: string, what: string }[],
 *   drift: string[],
 *   doneInRoot: string[],
 *   gone: string[],
 * }}
 */
export function collectRepo(repoPath, ident) {
  const dir = join(repoPath, "plans", "user-tasks");
  const out = { skipped: null, hasIndex: false, tasks: [], withheld: [], drift: [], doneInRoot: [], gone: [] };
  if (!existsSync(repoPath)) return { ...out, skipped: "repo folder not on this machine" };
  if (!existsSync(dir)) return { ...out, skipped: "no plans/user-tasks/ folder" };

  const rootFiles = listFiles(dir).filter((f) => TASK_FILE.test(f) && !/^0+[-_.]/.test(f));
  const completed = new Set(listFiles(join(dir, "completed")));
  const completedNumbers = new Set([...completed].map(fileNumber).filter(Boolean));
  const used = new Set();
  const keys = new Set();

  const indexPath = join(dir, "00-descriptions.md");
  const rows = existsSync(indexPath) ? parseIndexTable(readFileSync(indexPath, "utf8")) : [];
  out.hasIndex = existsSync(indexPath);

  const push = (/** @type {Omit<TaskRow, "key" | "app" | "appName" | "repoPath" | "body" | "bodyWithheld" | "sourceUpdatedAt">} */ t) => {
    const where = `${basename(repoPath)}/plans/user-tasks/${t.file ?? `00-descriptions.md row #${t.number}`}`;
    const rowHits = scanForSecrets([t.title, t.scope, t.blocks, t.status].join("\n"));
    if (rowHits.length) {
      out.withheld.push({ where, what: `index row skipped, ${describeHits(rowHits)}` });
      return;
    }
    let body = null;
    let bodyWithheld = null;
    let sourceUpdatedAt = null;
    if (t.file) {
      body = readBody(dir, t.file);
      sourceUpdatedAt = statSync(join(dir, t.file)).mtime.toISOString();
      const hits = scanForSecrets(body);
      if (hits.length) {
        bodyWithheld = describeHits(hits);
        out.withheld.push({ where, what: `body not uploaded, ${bodyWithheld}` });
        body = null;
      }
    }
    let key = `${ident.app}/${t.file ?? `#${t.number}`}`;
    for (let n = 2; keys.has(key); n++) key = `${ident.app}/${t.file ?? `#${t.number}`}~${n}`;
    keys.add(key);
    out.tasks.push({ key, app: ident.app, appName: ident.appName, repoPath, ...t, body, bodyWithheld, sourceUpdatedAt });
  };

  for (const row of rows) {
    let file = null;
    let closedByFile = false;
    if (row.link) {
      const link = row.link.replace(/^(\.\.\/)?user-tasks\//, "");
      const name = basename(link);
      // A link out of the folder points at another queue (or a README); that queue syncs itself.
      if (link.startsWith("../") || link.startsWith("/")) continue;
      if (link.startsWith("completed/")) closedByFile = true;
      else if (rootFiles.includes(name)) file = name;
      else if (completed.has(name)) closedByFile = true;
      else {
        // The rule lets BAM mark a task done by deleting its file, so a dangling link is a done task
        // whose index row was not updated.
        out.gone.push(`#${row.number} ${name}`);
        closedByFile = true;
      }
    } else {
      const candidates = rootFiles.filter((f) => sameNumber(fileNumber(f), row.number) && !used.has(f));
      if (candidates.length === 1) file = candidates[0];
      else if (candidates.length > 1)
        out.drift.push(`#${row.number} has no link and ${candidates.length} files share the number; attach a link in the index`);
      else if ([...completedNumbers].some((n) => sameNumber(n, row.number))) closedByFile = true;
    }
    if (closedByFile) continue;
    if (isClosedStatus(row.status)) {
      if (file) {
        used.add(file);
        out.doneInRoot.push(file);
      }
      continue;
    }
    if (file) used.add(file);
    push({
      number: row.number,
      numberInt: row.numberInt,
      file,
      title: row.title || file || `#${row.number}`,
      scope: row.scope,
      blocks: row.blocks,
      status: row.status,
      unindexed: false,
    });
  }

  for (const file of rootFiles) {
    if (used.has(file)) continue;
    const body = readFileSync(join(dir, file), "utf8");
    const status = extractField(body, "Status");
    if (status && isClosedStatus(status)) {
      out.doneInRoot.push(file);
      continue;
    }
    const number = fileNumber(file);
    push({
      number,
      numberInt: number ? Number.parseInt(number, 10) : null,
      file,
      title: extractTitle(body) ?? file.replace(/\.(md|sh)$/i, ""),
      scope: extractField(body, "Scope"),
      blocks: extractField(body, "Blocks"),
      status: status || (out.hasIndex ? "Not in the index" : "No index file"),
      unindexed: out.hasIndex,
    });
  }

  return out;
}
