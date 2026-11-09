// Unit tests for lib/ops/concurrency.mjs, the bounded fan-out the deploys, branches, roadmap and
// cost-cleanup loaders use. No network: `fn` is a fake that records how many calls are in flight.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "../../lib/ops/concurrency.mjs";

/** A fake async job: resolves after `ms`, recording the high-water mark of concurrent calls. */
function gauge() {
  let inFlight = 0;
  let peak = 0;
  const started = [];
  const fn = (delayOf) => async (item, index) => {
    started.push(item);
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, delayOf(item, index)));
    inFlight--;
    return `${item}!`;
  };
  return { fn, peak: () => peak, started };
}

test("results come back in input order even when later items finish first", async () => {
  const g = gauge();
  // The first item is the slowest, so a naive "push on completion" would reorder.
  const out = await mapWithConcurrency(["a", "b", "c", "d"], 4, g.fn((item) => (item === "a" ? 30 : 1)));
  assert.deepEqual(out, ["a!", "b!", "c!", "d!"]);
});

test("never has more than `limit` calls in flight, and still finishes every item", async () => {
  const g = gauge();
  const items = Array.from({ length: 9 }, (_, i) => i);
  const out = await mapWithConcurrency(items, 3, g.fn(() => 5));
  assert.equal(g.peak(), 3);
  assert.deepEqual(out, items.map((i) => `${i}!`));
  assert.deepEqual([...g.started].sort((a, b) => a - b), items);
});

test("a limit above the item count runs everything at once (plain Promise.all)", async () => {
  const g = gauge();
  await mapWithConcurrency([1, 2, 3], 50, g.fn(() => 5));
  assert.equal(g.peak(), 3);
});

test("a limit below 1 (or not a number) runs in sequence", async () => {
  for (const limit of [0, -2, NaN, undefined]) {
    const g = gauge();
    await mapWithConcurrency([1, 2, 3], limit, g.fn(() => 1));
    assert.equal(g.peak(), 1, `limit ${limit}`);
  }
});

test("fn receives the item and its index", async () => {
  const seen = [];
  await mapWithConcurrency(["x", "y"], 2, async (item, i) => {
    seen.push([item, i]);
  });
  assert.deepEqual(seen.sort((a, b) => a[1] - b[1]), [["x", 0], ["y", 1]]);
});

test("empty input resolves to an empty array without calling fn", async () => {
  let calls = 0;
  const out = await mapWithConcurrency([], 4, async () => {
    calls++;
  });
  assert.deepEqual(out, []);
  assert.equal(calls, 0);
});

test("the first rejection rejects the whole call, like Promise.all", async () => {
  await assert.rejects(
    mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }),
    /boom/,
  );
});

test("a loader that catches inside fn never rejects and keeps the failed slot in place", async () => {
  const out = await mapWithConcurrency(["ok", "bad", "ok"], 2, async (item) => {
    try {
      if (item === "bad") throw new Error("GitHub 403");
      return { item, error: null };
    } catch (err) {
      return { item, error: err instanceof Error ? err.message : String(err) };
    }
  });
  assert.deepEqual(out, [
    { item: "ok", error: null },
    { item: "bad", error: "GitHub 403" },
    { item: "ok", error: null },
  ]);
});
