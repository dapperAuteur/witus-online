// Unit tests for the deploys page's commit-status fallback (lib/ops/vercel-status.mjs): a repo with
// no GitHub deployments is read from the "Vercel" commit status on main. GitHub is mocked with a
// route table; no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findVercelStatus, loadVercelStatus, vercelState } from "../../lib/ops/vercel-status.mjs";
import { classifyDeploy } from "../../lib/ops/deploy-state.mjs";

const REPO = "dapperAuteur/invest-witus";
const sha = (c) => c.repeat(40);

/** A Vercel-style commit status. */
function status(state, { context = "Vercel", at = "2026-11-04T01:52:44Z", url = "https://vercel.com/team/p/abc" } = {}) {
  return { context, state, created_at: at, updated_at: at, description: `Deployment ${state}`, target_url: url };
}

/** Mocked GitHub: path -> response body (or { fail: status, message }). Records every path asked. */
function mockGithub(routes) {
  const calls = [];
  const get = async (path) => {
    calls.push(path);
    if (!(path in routes)) return { ok: false, status: 404, message: "Not Found" };
    const r = routes[path];
    if (r && r.fail) return { ok: false, status: r.fail, message: r.message ?? "" };
    return { ok: true, data: structuredClone(r) };
  };
  return { get, calls };
}

const headPath = `/repos/${REPO}/commits/main/status`;
const listPath = `/repos/${REPO}/commits?sha=main&per_page=5`;
const statusPath = (s) => `/repos/${REPO}/commits/${s}/status`;

test("vercelState passes GitHub's four commit-status states and treats others as pending", () => {
  for (const s of ["success", "failure", "error", "pending"]) assert.equal(vercelState(s), s);
  assert.equal(vercelState("something-new"), "pending");
});

test("findVercelStatus matches the context exactly, not per-project contexts", () => {
  assert.equal(findVercelStatus({ statuses: [status("success", { context: "Vercel – fit-t-cent-assessments" })] }), null);
  assert.equal(findVercelStatus({ statuses: [status("success", { context: "ci" }), status("failure")] })?.state, "failure");
  assert.equal(findVercelStatus(null), null);
});

test("green head: one request, live is main's head, target_url and updated_at carried", async () => {
  const { get, calls } = mockGithub({
    [headPath]: { sha: sha("a"), state: "success", statuses: [{ ...status("success", { at: "2026-11-04T01:50:00Z" }), updated_at: "2026-11-04T01:52:44Z" }] },
  });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.deepEqual(calls, [headPath]);
  assert.equal(r.error, null);
  assert.equal(r.latest?.sha, sha("a"));
  assert.equal(r.latest?.state, "success");
  assert.equal(r.latest?.statusAt, "2026-11-04T01:52:44Z");
  assert.equal(r.latest?.createdAt, "2026-11-04T01:50:00Z");
  assert.equal(r.latest?.logUrl, "https://vercel.com/team/p/abc");
  assert.equal(r.live, r.latest);
  const v = classifyDeploy({ latestState: r.latest.state, latestSha: r.latest.sha, liveSha: r.live.sha, mainSha: sha("a") });
  assert.equal(v.state, "live");
});

test("failed head: walks back to the newest green commit and stops there", async () => {
  const { get, calls } = mockGithub({
    [headPath]: { sha: sha("a"), statuses: [status("failure")] },
    [listPath]: [{ sha: sha("a") }, { sha: sha("b") }, { sha: sha("c") }, { sha: sha("d") }],
    [statusPath(sha("b"))]: { sha: sha("b"), statuses: [status("error")] },
    [statusPath(sha("c"))]: { sha: sha("c"), statuses: [status("success", { url: "https://vercel.com/team/p/ccc" })] },
    [statusPath(sha("d"))]: { sha: sha("d"), statuses: [status("success")] },
  });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.equal(r.latest?.state, "failure");
  assert.equal(r.live?.sha, sha("c"));
  assert.equal(r.live?.logUrl, "https://vercel.com/team/p/ccc");
  // Head status, the list, b, c: never d, and never the head's status twice.
  assert.deepEqual(calls, [headPath, listPath, statusPath(sha("b")), statusPath(sha("c"))]);
  assert.equal(classifyDeploy({ latestState: "failure", latestSha: sha("a"), liveSha: sha("c"), mainSha: sha("a") }).state, "failed");
});

test("building head maps to in-progress and still finds what is live", async () => {
  const { get } = mockGithub({
    [headPath]: { sha: sha("a"), statuses: [status("pending")] },
    [listPath]: [{ sha: sha("a") }, { sha: sha("b") }],
    [statusPath(sha("b"))]: { sha: sha("b"), statuses: [status("success")] },
  });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.equal(r.live?.sha, sha("b"));
  assert.equal(classifyDeploy({ latestState: r.latest.state, latestSha: r.latest.sha, liveSha: r.live.sha, mainSha: sha("a") }).state, "in-progress");
});

test("no green commit in the window: live unknown, walk capped by the list", async () => {
  const { get, calls } = mockGithub({
    [headPath]: { sha: sha("a"), statuses: [status("failure")] },
    [listPath]: [{ sha: sha("a") }, { sha: sha("b") }],
    [statusPath(sha("b"))]: { sha: sha("b"), statuses: [] },
  });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.equal(r.live, null);
  assert.equal(calls.length, 3);
});

test("a failed read while walking stops the walk without an error", async () => {
  const { get, calls } = mockGithub({
    [headPath]: { sha: sha("a"), statuses: [status("failure")] },
    [listPath]: [{ sha: sha("a") }, { sha: sha("b") }, { sha: sha("c") }],
    [statusPath(sha("b"))]: { fail: 502, message: "Bad Gateway" },
    [statusPath(sha("c"))]: { sha: sha("c"), statuses: [status("success")] },
  });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.equal(r.error, null);
  assert.equal(r.live, null);
  assert.equal(calls.includes(statusPath(sha("c"))), false);
});

test("no Vercel status on main: latest null, so the row stays 'none'", async () => {
  const { get, calls } = mockGithub({ [headPath]: { sha: sha("a"), state: "pending", statuses: [] } });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.deepEqual(r, { latest: null, live: null, error: null });
  assert.equal(calls.length, 1);
});

test("head read refused: the error is passed up for the permission message", async () => {
  const { get } = mockGithub({ [headPath]: { fail: 403, message: "Resource not accessible by personal access token" } });
  const r = await loadVercelStatus({ repo: REPO, get });
  assert.deepEqual(r.error, { status: 403, message: "Resource not accessible by personal access token" });
  assert.equal(r.latest, null);
});
