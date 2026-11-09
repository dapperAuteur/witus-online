// Bounded parallelism for the admin pages' fan-out reads (GitHub per repo, Vercel per project,
// Neon per project). Pure, no imports, so `npm test` covers it (scripts/lib/concurrency.test.mjs).
//
// Why a bound: Promise.all over the registry fires every first request at once (54 to GitHub for
// the deploys page, 87 for the roadmap), and GitHub's secondary limit refuses bursts near 100
// concurrent requests with a 403 the page then shows as an error row. A pool of a few workers keeps
// a cold load within a few seconds and never approaches that limit. Why not run in sequence: 27
// repos at three or four dependent calls each would take 25 to 40 seconds.

/**
 * Map `items` through `fn` with at most `limit` calls in flight. Results come back in input order,
 * so callers see exactly what `Promise.all(items.map(fn))` gives. The first rejection rejects the
 * whole call (as Promise.all does); loaders that must never throw catch inside `fn`.
 * @template T, R
 * @param {readonly T[]} items
 * @param {number} limit  workers; below 1 means 1, above items.length is plain Promise.all
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, fn) {
  const workers = Math.min(Math.max(1, Math.floor(Number(limit) || 1)), items.length);
  /** @type {R[]} */
  const results = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: workers }, run));
  return results;
}
