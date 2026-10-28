// usage-core.mjs: the pure functions behind scripts/usage-report.mjs.
// De-duplication of transcript usage lines, pricing from the JSON table, aggregation, and the
// mistake-ledger windows. No file or network access, so scripts/lib/usage-core.test.mjs can run on
// small fixtures. Everything money-shaped here is API-equivalent list price in US dollars, and
// 1 credit = 1 US dollar of that list price (see the header of scripts/usage-report.mjs).

export const CREDIT_DEFINITION =
  "1 credit = 1 US dollar of API list price (API-equivalent, not what the plan charges)";

/** Shapes the parsed claude-prices.json into { models, aliases, source, cached, unit }. */
export function normalizePrices(table) {
  const models = {};
  for (const [id, p] of Object.entries(table.models ?? {})) {
    for (const k of ["input", "cacheWrite5m", "cacheWrite1h", "cacheRead", "output"]) {
      if (typeof p[k] !== "number") throw new Error(`price table: ${id}.${k} is not a number`);
    }
    models[id] = { input: p.input, cacheWrite5m: p.cacheWrite5m, cacheWrite1h: p.cacheWrite1h, cacheRead: p.cacheRead, output: p.output };
  }
  return { models, aliases: table.aliases ?? {}, source: table._source ?? "", cached: table._cached ?? "", unit: table._unit ?? "" };
}

/** The price row for a model id, following aliases; null when the table lacks it. */
export function priceFor(prices, model) {
  const id = prices.aliases[model] ?? model;
  return prices.models[id] ?? null;
}

/** API-equivalent list price in US dollars for one record, or null when the model is unpriced. */
export function costOf(prices, r) {
  const p = priceFor(prices, r.model);
  if (!p) return null;
  return (
    (r.input * p.input +
      r.cacheWrite5m * p.cacheWrite5m +
      r.cacheWrite1h * p.cacheWrite1h +
      r.cacheRead * p.cacheRead +
      r.output * p.output) /
    1e6
  );
}

// ---- de-duplication ----------------------------------------------------------------------------

/**
 * Folds one parsed transcript line into `records` (a Map keyed by message id). Claude Code writes
 * one jsonl line per content block of the same API response (thinking, text, each tool call) and
 * repeats the usage object on every line: input and cache fields are identical across those lines
 * and output_tokens grows to its final value. So one record per message id, and output takes the
 * final value, which is the largest seen: a few transcripts hold a replayed copy of the same lines
 * in which the later copy carries the initial count (2 or 5 tokens) after the real total, so "the
 * last line" would under-count those. Lines with no message id are keyed by file and line uuid.
 * `meta` is { file, rel, project, session, isSub }. Returns true when the line carried usage.
 */
export function addUsageLine(records, parsed, meta) {
  const u = parsed?.message?.usage;
  if (!u) return false;
  const ts = parsed.timestamp || "";
  const id = parsed.message.id || `${meta.file}#${parsed.uuid ?? ""}`;
  const prev = records.get(id);
  if (prev) {
    if (typeof u.output_tokens === "number") prev.output = Math.max(prev.output, u.output_tokens);
    if (ts && (!prev.ts || ts < prev.ts)) prev.ts = ts;
    return true;
  }
  records.set(id, {
    id,
    file: meta.file,
    rel: meta.rel,
    project: meta.project,
    session: meta.session,
    isSub: meta.isSub,
    ts,
    model: parsed.message.model || "unknown",
    input: u.input_tokens || 0,
    cacheWrite5m: u.cache_creation?.ephemeral_5m_input_tokens ?? (u.cache_creation_input_tokens || 0),
    cacheWrite1h: u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens || 0,
    output: u.output_tokens || 0,
  });
  return true;
}

// ---- aggregation --------------------------------------------------------------------------------

export function emptyBucket() {
  return { responses: 0, input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0, usd: 0, unpriced: 0 };
}

export function addToBucket(b, r, prices) {
  b.responses++;
  b.input += r.input;
  b.cacheWrite5m += r.cacheWrite5m;
  b.cacheWrite1h += r.cacheWrite1h;
  b.cacheRead += r.cacheRead;
  b.output += r.output;
  const c = costOf(prices, r);
  if (c === null) b.unpriced++;
  else b.usd += c;
  return b;
}

export function addBuckets(a, b) {
  for (const k of Object.keys(a)) a[k] += b[k] ?? 0;
  return a;
}

export function tokensOf(b) {
  return b.input + b.cacheWrite5m + b.cacheWrite1h + b.cacheRead + b.output;
}

/**
 * Totals over every record: overall, by month (UTC, from the timestamp), by model and by project
 * dir, plus the list of model ids the price table lacks (with their response counts) and the
 * coverage range.
 */
export function aggregate(records, prices) {
  const total = emptyBucket();
  const byMonth = {}, byModel = {}, byProject = {}, unpriced = {};
  let coverageStart = null, coverageEnd = null;
  for (const r of records.values()) {
    if (r.ts) {
      if (!coverageStart || r.ts < coverageStart) coverageStart = r.ts;
      if (!coverageEnd || r.ts > coverageEnd) coverageEnd = r.ts;
    }
    const month = r.ts ? r.ts.slice(0, 7) : "unknown";
    addToBucket((byMonth[month] ??= emptyBucket()), r, prices);
    addToBucket((byModel[r.model] ??= emptyBucket()), r, prices);
    addToBucket((byProject[r.project] ??= emptyBucket()), r, prices);
    addToBucket(total, r, prices);
    if (!priceFor(prices, r.model)) unpriced[r.model] = (unpriced[r.model] ?? 0) + 1;
  }
  const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return {
    total,
    byMonth: sortKeys(byMonth),
    byModel: Object.fromEntries(Object.entries(byModel).sort((a, b) => b[1].responses - a[1].responses)),
    byProject: sortKeys(byProject),
    unpricedModels: Object.entries(unpriced).map(([model, responses]) => ({ model, responses })),
    coverageStart,
    coverageEnd,
  };
}

// ---- mistake ledger -----------------------------------------------------------------------------

/** Session id from a ledger row's `session` ("<id>", "<id>.jsonl" or "<id>/subagents/<agent>.jsonl"). */
export function sessionIdOf(session) {
  const s = String(session ?? "").trim();
  if (!s) return "";
  return s.split("/")[0].replace(/\.jsonl$/, "");
}

/** True when the record belongs to the ledger row's file set (before the time window is applied). */
function recordInScope(r, row) {
  const s = String(row.session ?? "").trim();
  if (!s) return false;
  if (s.includes("/")) {
    // One named file (a subagent transcript): match its path under the project dir.
    const path = s.endsWith(".jsonl") ? s : `${s}.jsonl`;
    return r.rel.endsWith(`/${path}`) || r.rel === path;
  }
  const id = sessionIdOf(s);
  const matches = id.length >= 36 ? r.session === id : r.session.startsWith(id);
  if (!matches) return false;
  if (row.scope === "with-subagents") return true;
  return !r.isSub;
}

/**
 * Sums one ledger row's window. Rules:
 *  - `session` names a top-level transcript ("<id>" or "<id>.jsonl") or one subagent file
 *    ("<id>/subagents/<agent>.jsonl"). A short id (under 36 characters) matches by prefix.
 *  - `start` and `end` (ISO, UTC) bound the window inclusively; both null means the whole file.
 *  - `scope` "main" counts the named file only; "with-subagents" adds the session's subagent files.
 * `files` is the list of file metas ({ rel, session, isSub }) so a row whose transcript is not on
 * disk is reported with found = false and zero usage.
 */
export function ledgerRowUsage(records, row, prices, files) {
  const bucket = emptyBucket();
  const probe = { rel: "", session: "", isSub: false };
  const found = files.some((f) => recordInScope(Object.assign(probe, { rel: f.rel, session: f.session, isSub: f.isSub }), row));
  if (!found) return { bucket, found: false };
  for (const r of records.values()) {
    if (!recordInScope(r, row)) continue;
    if (row.start && r.ts < row.start) continue;
    if (row.end && r.ts > row.end) continue;
    addToBucket(bucket, r, prices);
  }
  return { bucket, found: true };
}

/**
 * Computes every ledger row and the two totals: `counted` (rows with counted: true) and
 * `listedNotCounted` (the rest). `share` is counted.usd over total.usd.
 */
export function computeLedger(records, rows, prices, files, total) {
  const out = [];
  const counted = emptyBucket();
  const listedNotCounted = emptyBucket();
  for (const row of rows) {
    const { bucket, found } = ledgerRowUsage(records, row, prices, files);
    const isCounted = row.counted === true;
    addBuckets(isCounted ? counted : listedNotCounted, bucket);
    out.push({
      id: row.id,
      date: row.date,
      repo: row.repo,
      session: row.session,
      start: row.start ?? null,
      end: row.end ?? null,
      scope: row.scope ?? "main",
      description: row.description,
      reported: row.reported ?? "",
      counted: isCounted,
      reason: isCounted ? undefined : row.reason ?? "",
      found,
      responses: bucket.responses,
      tokens: tokensOf(bucket),
      usd: bucket.usd,
    });
  }
  const share = total.usd > 0 ? counted.usd / total.usd : 0;
  return { rows: out, counted, listedNotCounted, share };
}

/** Parses mistakes.jsonl text: one JSON object per non-blank line; lines starting with # are comments. */
export function parseLedger(text) {
  const rows = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch (e) {
      throw new Error(`mistakes.jsonl line ${i + 1}: ${e.message}`);
    }
    for (const k of ["id", "date", "repo", "session", "scope", "description"]) {
      if (!(k in o)) throw new Error(`mistakes.jsonl line ${i + 1} (${o.id ?? "no id"}): missing ${k}`);
    }
    if (!["main", "with-subagents"].includes(o.scope)) throw new Error(`mistakes.jsonl line ${i + 1} (${o.id}): scope must be main or with-subagents`);
    if (o.counted !== true && !o.reason) throw new Error(`mistakes.jsonl line ${i + 1} (${o.id}): counted is not true, so reason is required`);
    rows.push(o);
  }
  return rows;
}

// ---- formatting -------------------------------------------------------------------------------

export const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
export const fmtCredits = (usd) => usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtPct = (x) => `${(100 * x).toFixed(2)}%`;

// ---- database row -------------------------------------------------------------------------------

/** Column order of the claude_usage_snapshots insert (db/schema.ts claudeUsageSnapshots). */
export const SNAPSHOT_COLUMNS = [
  "taken_at",
  "machine",
  "coverage_start",
  "coverage_end",
  "responses",
  "input_tokens",
  "cache_write_5m_tokens",
  "cache_write_1h_tokens",
  "cache_read_tokens",
  "output_tokens",
  "list_price_usd",
  "mistake_price_usd",
  "mistake_share",
  "detail",
];

/** The jsonb `detail` column: everything the admin page renders beyond the scalar columns. */
export function detailOf(snapshot) {
  return {
    credits: snapshot.credits,
    transcriptRoot: snapshot.transcriptRoot,
    files: snapshot.files,
    usageLines: snapshot.usageLines,
    byMonth: snapshot.byMonth,
    byModel: snapshot.byModel,
    byProject: snapshot.byProject,
    unpricedModels: snapshot.unpricedModels,
    prices: { source: snapshot.prices.source, cached: snapshot.prices.cached, unit: snapshot.prices.unit },
    ledger: snapshot.ledger,
  };
}

/** Parameterised INSERT for one snapshot: { text, values }, values in SNAPSHOT_COLUMNS order. */
export function buildSnapshotInsert(snapshot) {
  const t = snapshot.total;
  const values = [
    snapshot.takenAt,
    snapshot.machine,
    snapshot.coverageStart,
    snapshot.coverageEnd,
    t.responses,
    t.input,
    t.cacheWrite5m,
    t.cacheWrite1h,
    t.cacheRead,
    t.output,
    t.usd.toFixed(4),
    snapshot.ledger.counted.usd.toFixed(4),
    snapshot.ledger.share.toFixed(6),
    JSON.stringify(detailOf(snapshot)),
  ];
  if (values.length !== SNAPSHOT_COLUMNS.length) throw new Error("snapshot insert: column and value counts differ");
  const placeholders = SNAPSHOT_COLUMNS.map((c, i) => (c === "detail" ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const text = `INSERT INTO claude_usage_snapshots (${SNAPSHOT_COLUMNS.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id, taken_at`;
  return { text, values };
}
