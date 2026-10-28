// Tests for usage-core.mjs. Run: npm test (node --test). No transcripts are read; every record is
// a fixture. The pricing examples are the worked arithmetic from
// plans/usage-reports/2026-10-27-token-usage-and-mistake-cost.md sections 3 and 5.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addUsageLine,
  aggregate,
  buildSnapshotInsert,
  computeLedger,
  costOf,
  ledgerRowUsage,
  normalizePrices,
  parseLedger,
  SNAPSHOT_COLUMNS,
  tokensOf,
} from "./usage-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const prices = normalizePrices(JSON.parse(readFileSync(join(here, "claude-prices.json"), "utf8")));

const SESSION = "ee7c326d-0bf3-4f76-b948-d1e152be4a3a";
const PROJECT = "-Users-bam-Code-NOiCloud-ai-builds-gemini-witus";
const mainMeta = { file: `/t/${PROJECT}/${SESSION}.jsonl`, rel: `${PROJECT}/${SESSION}.jsonl`, project: PROJECT, session: SESSION, isSub: false };
const subMeta = {
  file: `/t/${PROJECT}/${SESSION}/subagents/agent-abc.jsonl`,
  rel: `${PROJECT}/${SESSION}/subagents/agent-abc.jsonl`,
  project: PROJECT,
  session: SESSION,
  isSub: true,
};
const files = [mainMeta, subMeta];

function line(id, ts, usage, model = "claude-fable-5-1", uuid = undefined) {
  return { timestamp: ts, uuid, message: { id, model, usage } };
}
const usage = (input, cw5m, cw1h, cr, out) => ({
  input_tokens: input,
  cache_creation_input_tokens: cw5m + cw1h,
  cache_creation: { ephemeral_5m_input_tokens: cw5m, ephemeral_1h_input_tokens: cw1h },
  cache_read_input_tokens: cr,
  output_tokens: out,
});

test("de-duplication: two lines with the same message id count once; output takes the final (largest) value", () => {
  const records = new Map();
  assert.equal(addUsageLine(records, line("msg_1", "2026-10-01T00:00:00.000Z", usage(10, 60, 40, 1000, 5)), mainMeta), true);
  assert.equal(addUsageLine(records, line("msg_1", "2026-10-01T00:00:01.000Z", usage(10, 60, 40, 1000, 42)), mainMeta), true);
  assert.equal(addUsageLine(records, { timestamp: "2026-10-01T00:00:02.000Z", type: "user", message: { role: "user" } }, mainMeta), false);
  assert.equal(records.size, 1);
  const r = records.get("msg_1");
  assert.equal(r.output, 42);
  // A replayed copy of the same lines carries the initial count after the real total; it must not lower it.
  addUsageLine(records, line("msg_1", "2026-10-01T00:00:00.000Z", usage(10, 60, 40, 1000, 5)), mainMeta);
  assert.equal(records.get("msg_1").output, 42);
  assert.equal(records.size, 1);
  assert.equal(r.input, 10);
  assert.equal(r.cacheWrite5m, 60);
  assert.equal(r.cacheWrite1h, 40);
  assert.equal(r.cacheRead, 1000);
  assert.equal(r.ts, "2026-10-01T00:00:00.000Z");
  addUsageLine(records, line("msg_2", "2026-10-01T00:00:03.000Z", usage(1, 0, 0, 0, 1)), mainMeta);
  assert.equal(records.size, 2);
});

test("de-duplication: a line without a message id is keyed by file and uuid, not merged", () => {
  const records = new Map();
  addUsageLine(records, line(undefined, "2026-10-01T00:00:00.000Z", usage(1, 0, 0, 0, 1), "<synthetic>", "u1"), mainMeta);
  addUsageLine(records, line(undefined, "2026-10-01T00:00:01.000Z", usage(1, 0, 0, 0, 1), "<synthetic>", "u2"), mainMeta);
  assert.equal(records.size, 2);
});

test("pricing: the M10 row, all on claude-fable-5-1, comes to 0.88", () => {
  // (38 x 10 + 9,733 x 20 + 925,512 x 0.25 + 9,038 x 50) / 1e6 = 0.878318
  const usd = costOf(prices, { model: "claude-fable-5-1", input: 38, cacheWrite5m: 0, cacheWrite1h: 9733, cacheRead: 925512, output: 9038 });
  assert.ok(Math.abs(usd - 0.878318) < 1e-9, `got ${usd}`);
  assert.equal(usd.toFixed(2), "0.88");
});

test("pricing: the claude-opus-5-5 model row comes to 3,137.79", () => {
  const usd = costOf(prices, { model: "claude-opus-5-5", input: 76752, cacheWrite5m: 174003855, cacheWrite1h: 47588196, cacheRead: 7531190157, output: 19026049 });
  assert.equal(usd.toFixed(2), "3137.79");
});

test("pricing: an alias resolves and an unknown model is unpriced (null), never guessed", () => {
  assert.equal(costOf(prices, { model: "claude-haiku-4-5-20251001", input: 1e6, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0 }), 1);
  assert.equal(costOf(prices, { model: "claude-made-up-9", input: 1e6, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0 }), null);
  assert.equal(costOf(prices, { model: "<synthetic>", input: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, output: 0 }), null);
});

function fixtureRecords() {
  const records = new Map();
  addUsageLine(records, line("m1", "2026-10-28T02:28:26.075Z", usage(10, 0, 100, 1000, 10)), mainMeta);
  addUsageLine(records, line("m2", "2026-10-28T02:30:00.000Z", usage(10, 0, 100, 1000, 10)), mainMeta);
  addUsageLine(records, line("m3", "2026-10-28T02:50:00.000Z", usage(10, 0, 100, 1000, 10)), mainMeta);
  addUsageLine(records, line("a1", "2026-10-28T02:31:00.000Z", usage(10, 0, 100, 1000, 10)), subMeta);
  return records;
}
const ONE = tokensOf({ input: 10, cacheWrite5m: 0, cacheWrite1h: 100, cacheRead: 1000, output: 10 });

test("ledger window: main scope sums the top-level file inside the window only", () => {
  const { bucket, found } = ledgerRowUsage(fixtureRecords(), { session: `${SESSION}.jsonl`, start: "2026-10-28T02:28:26.075Z", end: "2026-10-28T02:42:24.929Z", scope: "main" }, prices, files);
  assert.equal(found, true);
  assert.equal(bucket.responses, 2);
  assert.equal(tokensOf(bucket), 2 * ONE);
});

test("ledger window: with-subagents adds the subagent file; null start and end means the whole file", () => {
  const withSubs = ledgerRowUsage(fixtureRecords(), { session: SESSION, start: "2026-10-28T02:28:26.075Z", end: "2026-10-28T02:42:24.929Z", scope: "with-subagents" }, prices, files);
  assert.equal(withSubs.bucket.responses, 3);
  const whole = ledgerRowUsage(fixtureRecords(), { session: SESSION, start: null, end: null, scope: "main" }, prices, files);
  assert.equal(whole.bucket.responses, 3);
  const oneAgent = ledgerRowUsage(fixtureRecords(), { session: `${SESSION}/subagents/agent-abc.jsonl`, start: null, end: null, scope: "main" }, prices, files);
  assert.equal(oneAgent.bucket.responses, 1);
  const byPrefix = ledgerRowUsage(fixtureRecords(), { session: "ee7c326d", start: null, end: null, scope: "main" }, prices, files);
  assert.equal(byPrefix.bucket.responses, 3);
});

test("ledger window: a session that is not on disk is not_found with zero usage", () => {
  const { bucket, found } = ledgerRowUsage(fixtureRecords(), { session: "009052d6", start: null, end: null, scope: "main" }, prices, files);
  assert.equal(found, false);
  assert.equal(bucket.responses, 0);
  assert.equal(bucket.usd, 0);
});

test("ledger totals: counted rows sum into counted, the rest into listedNotCounted, share over total", () => {
  const records = fixtureRecords();
  const agg = aggregate(records, prices);
  const rows = [
    { id: "M10", date: "2026-10-28", repo: "tour-manager-os", session: SESSION, start: "2026-10-28T02:28:26.075Z", end: "2026-10-28T02:42:24.929Z", scope: "main", description: "x", counted: true },
    { id: "X1", date: "2026-10-28", repo: "witus", session: SESSION, start: "2026-10-28T02:49:00.000Z", end: "2026-10-28T02:51:00.000Z", scope: "main", description: "y", counted: false, reason: "adjacent" },
    { id: "N1", date: "2026-04", repo: "witus", session: "009052d6", start: null, end: null, scope: "main", description: "z", counted: false, reason: "not on disk" },
  ];
  const ledger = computeLedger(records, rows, prices, files, agg.total);
  assert.equal(ledger.counted.responses, 2);
  assert.equal(ledger.listedNotCounted.responses, 1);
  assert.equal(ledger.rows[2].found, false);
  assert.equal(ledger.rows[2].usd, 0);
  assert.ok(Math.abs(ledger.share - 2 / 4) < 1e-12);
});

test("unpriced models are listed with their response counts and excluded from the dollar total", () => {
  const records = fixtureRecords();
  addUsageLine(records, line("s1", "2026-10-28T03:00:00.000Z", usage(0, 0, 0, 0, 0), "<synthetic>"), mainMeta);
  addUsageLine(records, line("u1", "2026-10-28T03:01:00.000Z", usage(1e6, 0, 0, 0, 0), "claude-made-up-9"), mainMeta);
  addUsageLine(records, line("u2", "2026-10-28T03:02:00.000Z", usage(1e6, 0, 0, 0, 0), "claude-made-up-9"), mainMeta);
  const agg = aggregate(records, prices);
  assert.deepEqual(agg.unpricedModels.sort((a, b) => a.model.localeCompare(b.model)), [
    { model: "<synthetic>", responses: 1 },
    { model: "claude-made-up-9", responses: 2 },
  ]);
  assert.equal(agg.total.unpriced, 3);
  assert.equal(agg.total.responses, 7);
  const pricedOnly = 4 * costOf(prices, { model: "claude-fable-5-1", input: 10, cacheWrite5m: 0, cacheWrite1h: 100, cacheRead: 1000, output: 10 });
  assert.ok(Math.abs(agg.total.usd - pricedOnly) < 1e-12);
  assert.equal(agg.coverageStart, "2026-10-28T02:28:26.075Z");
  assert.equal(agg.coverageEnd, "2026-10-28T03:02:00.000Z");
  assert.deepEqual(Object.keys(agg.byMonth), ["2026-10"]);
});

test("parseLedger: comments are skipped, scope and reason are validated", () => {
  const ok = parseLedger('# comment\n\n{"id":"M1","date":"2026-09-18","repo":"witus","session":"abc","start":null,"end":null,"scope":"main","description":"d","reported":"r","counted":true}\n');
  assert.equal(ok.length, 1);
  assert.throws(() => parseLedger('{"id":"M1","date":"d","repo":"r","session":"s","scope":"all","description":"d","counted":true}'), /scope must be/);
  assert.throws(() => parseLedger('{"id":"M1","date":"d","repo":"r","session":"s","scope":"main","description":"d","counted":false}'), /reason is required/);
  assert.throws(() => parseLedger('{"id":"M1"}'), /missing date/);
});

test("buildSnapshotInsert: one placeholder per column, detail cast to jsonb", () => {
  const records = fixtureRecords();
  const agg = aggregate(records, prices);
  const ledger = computeLedger(records, [], prices, files, agg.total);
  const snapshot = {
    takenAt: "2026-10-28T04:00:00.000Z",
    machine: "test-host",
    transcriptRoot: "/t",
    files: 2,
    usageLines: 4,
    coverageStart: agg.coverageStart,
    coverageEnd: agg.coverageEnd,
    credits: "1 credit = 1 US dollar of API list price",
    total: agg.total,
    byMonth: agg.byMonth,
    byModel: agg.byModel,
    byProject: agg.byProject,
    unpricedModels: agg.unpricedModels,
    prices: { source: "s", cached: "2026-10-06", unit: "u", models: prices.models, aliases: prices.aliases },
    ledger,
  };
  const { text, values } = buildSnapshotInsert(snapshot);
  assert.equal(values.length, SNAPSHOT_COLUMNS.length);
  assert.match(text, /\$14::jsonb/);
  assert.equal(values[4], 4);
  assert.equal(values[12], "0.000000");
  const detail = JSON.parse(values[13]);
  assert.deepEqual(Object.keys(detail.byMonth), ["2026-10"]);
  assert.equal(detail.prices.cached, "2026-10-06");
  assert.equal("models" in detail.prices, false);
});
