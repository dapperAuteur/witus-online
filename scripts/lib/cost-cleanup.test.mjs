// /admin/cost-cleanup delete loop (lib/cost-cleanup/run.ts) against the real Vercel and Neon clients
// with fetch mocked. No network: every request goes to the fake below and is recorded.
// Why (BAM, 2026-11-01): a cleanup deleted 32 previews, then reported 40 "failures" that were all
// Vercel 429s, and Neon branches the integration had already removed would have failed as 404s.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { runCleanup, summarizeCleanup } from "../../lib/cost-cleanup/run.ts";
import * as vercel from "../../lib/cost-cleanup/vercel.ts";
import * as neon from "../../lib/cost-cleanup/neon.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Installs a fake fetch. `route(method, url)` returns a Response; every call is recorded. */
function mockFetch(route) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    calls.push(`${method} ${url}`);
    return route(method, String(url));
  };
  return calls;
}

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const RESET_MS = 1793568060000; // epoch ms, the shape Vercel's 429 body uses for error.limit.reset
const rateLimitBody = {
  error: {
    code: "rate_limited",
    message: "Too many requests - try again in 10 minutes (more than 200, code: now-rm)",
    limit: { remaining: 0, reset: RESET_MS, total: 200 },
  },
};

const dep = (n) => ({ uid: `dpl_${n}`, url: `app-${n}.vercel.app`, projectId: "prj_1", projectName: "app", created: n });
const branch = (id, extra = {}) => ({
  id,
  name: `preview/${id}`,
  projectId: "p1",
  projectName: "proj",
  createdAt: "2026-10-01T00:00:00Z",
  default: false,
  protected: false,
  ...extra,
});

/** The same wiring lib/cost-cleanup/index.ts cleanup() uses, with fixed keys and team. */
function realOps({ withVercel = true, withNeon = true } = {}) {
  return {
    vercel: withVercel ? { deleteDeployment: (d) => vercel.deleteDeployment("tok", "team_1", d.uid) } : undefined,
    neon: withNeon
      ? {
          hasKey: (projectId) => projectId === "p1",
          listBranches: (b) => neon.listBranches("key", { id: b.projectId, name: b.projectName }),
          isDeletable: neon.isDeletablePreviewBranch,
          deleteBranch: (b) => neon.deleteBranch("key", b.projectId, b.id),
        }
      : undefined,
  };
}

test("first Vercel 429 stops the Vercel loop and reports the rest as waiting, not failed", async () => {
  let deletes = 0;
  const calls = mockFetch((method, url) => {
    if (method === "DELETE" && url.includes("/v13/deployments/")) {
      deletes++;
      return deletes <= 2 ? new Response(null, { status: 200 }) : json(429, rateLimitBody, { "x-ratelimit-reset": "1" });
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  const deployments = [1, 2, 3, 4, 5].map(dep);
  const res = await runCleanup(deployments, [], realOps({ withNeon: false }));

  assert.equal(calls.length, 3, "no Vercel call after the first 429");
  assert.equal(res.vercelDeleted, 2);
  assert.deepEqual(res.failures, []);
  assert.equal(res.rateLimited.remaining, 3);
  assert.equal(res.rateLimited.retryAt, new Date(RESET_MS).toISOString(), "body limit.reset (ms) wins over the header");
  assert.deepEqual(res.rateLimited.notAttempted.map((d) => d.uid), ["dpl_3", "dpl_4", "dpl_5"]);
});

test("429 without a body reset falls back to x-ratelimit-reset (seconds); none at all leaves retryAt unset", async () => {
  mockFetch(() => new Response("Too many requests", { status: 429, headers: { "x-ratelimit-reset": "1793568060" } }));
  const a = await runCleanup([dep(1)], [], realOps({ withNeon: false }));
  assert.equal(a.rateLimited.retryAt, new Date(1793568060 * 1000).toISOString());

  mockFetch(() => new Response("Too many requests", { status: 429 }));
  const b = await runCleanup([dep(1), dep(2)], [], realOps({ withNeon: false }));
  assert.equal(b.rateLimited.remaining, 2);
  assert.equal(b.rateLimited.retryAt, undefined);
});

test("a non-429 Vercel error is a failure and the loop carries on", async () => {
  const calls = mockFetch((method, url) => (url.includes("dpl_1") ? json(500, { error: { code: "internal" } }) : new Response(null, { status: 200 })));
  const res = await runCleanup([dep(1), dep(2)], [], realOps({ withNeon: false }));
  assert.equal(calls.length, 2);
  assert.equal(res.vercelDeleted, 1);
  assert.equal(res.failures.length, 1);
  assert.match(res.failures[0], /dpl_1|app-1/);
  assert.equal(res.rateLimited, undefined);
});

test("neon.deleteBranch: 404 is 'gone', other errors throw NeonApiError with the status", async () => {
  mockFetch(() => json(404, { code: "", message: "branch not found" }));
  assert.equal(await neon.deleteBranch("key", "p1", "br_x"), "gone");
  mockFetch(() => json(200, { branch: {} }));
  assert.equal(await neon.deleteBranch("key", "p1", "br_x"), "deleted");
  mockFetch(() => json(500, { message: "boom" }));
  await assert.rejects(neon.deleteBranch("key", "p1", "br_x"), (e) => e instanceof neon.NeonApiError && e.status === 500);
});

test("Vercel runs first; Neon re-lists and deletes only branches still present and still deletable", async () => {
  // Re-list after the Vercel pass: b_gone was removed by Neon itself, b_prot is protected now,
  // b_404 is listed but answers 404 on delete, b_ok is deleted.
  const relisted = [
    { id: "main", name: "main", created_at: "2026-01-01", default: true },
    { id: "b_ok", name: "preview/b_ok", created_at: "2026-10-01" },
    { id: "b_404", name: "preview/b_404", created_at: "2026-10-01" },
    { id: "b_prot", name: "preview/b_prot", created_at: "2026-10-01", protected: true },
  ];
  const calls = mockFetch((method, url) => {
    if (url.startsWith("https://api.vercel.com/")) return new Response(null, { status: 200 });
    if (method === "GET" && url.endsWith("/projects/p1/branches")) return json(200, { branches: relisted });
    if (method === "DELETE" && url.endsWith("/branches/b_ok")) return json(200, { branch: {} });
    if (method === "DELETE" && url.endsWith("/branches/b_404")) return json(404, { message: "not found" });
    throw new Error(`unexpected ${method} ${url}`);
  });
  const res = await runCleanup([dep(1)], [branch("b_ok"), branch("b_gone"), branch("b_404"), branch("b_prot")], realOps());

  assert.ok(calls[0].startsWith("DELETE https://api.vercel.com/"), "Vercel delete happens before any Neon call");
  assert.equal(calls.filter((c) => c.startsWith("GET")).length, 1, "one re-list per project");
  const neonDeletes = calls.filter((c) => c.startsWith("DELETE https://console.neon.tech"));
  assert.deepEqual(
    neonDeletes.map((c) => c.split("/").pop()),
    ["b_ok", "b_404"],
    "never DELETE a branch missing from the re-list or one that no longer passes the filter",
  );
  assert.equal(res.vercelDeleted, 1);
  assert.equal(res.neonDeleted, 1);
  assert.equal(res.alreadyGone, 2, "b_gone (missing from re-list) and b_404 (404 on delete)");
  assert.equal(res.failures.length, 1);
  assert.match(res.failures[0], /b_prot.*no longer passes the preview filter/);
});

test("Neon keeps going after a Vercel 429; a failed re-list falls back to the inventory and a 404 is still gone", async () => {
  mockFetch((method, url) => {
    if (url.startsWith("https://api.vercel.com/")) return json(429, rateLimitBody);
    if (method === "GET") return json(500, { message: "list failed" });
    if (method === "DELETE" && url.endsWith("/branches/b_a")) return json(404, { message: "not found" });
    if (method === "DELETE" && url.endsWith("/branches/b_b")) return json(200, { branch: {} });
    throw new Error(`unexpected ${method} ${url}`);
  });
  const res = await runCleanup([dep(1), dep(2)], [branch("b_a"), branch("b_b"), branch("b_c", { projectId: "p2" })], realOps());
  assert.equal(res.rateLimited.remaining, 2);
  assert.equal(res.neonDeleted, 1);
  assert.equal(res.alreadyGone, 1);
  assert.deepEqual(res.failures, ["neon proj/preview/b_c: no key for project p2"]);
});

test("summary: every bucket counted once, failures exclude gone and waiting", () => {
  const res = {
    vercelDeleted: 32,
    neonDeleted: 3,
    alreadyGone: 2,
    failures: ["x"],
    rateLimited: { remaining: 40, retryAt: new Date(RESET_MS).toISOString(), notAttempted: [] },
  };
  assert.equal(
    summarizeCleanup(res, 1),
    "Deleted 32 preview deployments and 3 Neon branches; 3 already gone; 40 waiting on Vercel's limit; 1 failed.",
  );
  assert.equal(
    summarizeCleanup({ vercelDeleted: 1, neonDeleted: 1, alreadyGone: 0, failures: [] }),
    "Deleted 1 preview deployment and 1 Neon branch; 0 already gone; 0 waiting on Vercel's limit; 0 failed.",
  );
});

test("rateLimitResetAt reads ms from the body, seconds from the header", () => {
  const h = new Headers({ "x-ratelimit-reset": "1793568060" });
  assert.equal(vercel.rateLimitResetAt(JSON.stringify(rateLimitBody), h), new Date(RESET_MS).toISOString());
  assert.equal(vercel.rateLimitResetAt("not json", h), new Date(1793568060000).toISOString());
  assert.equal(vercel.rateLimitResetAt("", new Headers()), undefined);
});
