import { test, expect } from "@playwright/test";

// /admin/tasks holds every app's operator tasks, synced from BAM's gitignored plans/ folders. The
// signed-in view needs the admin account and the site database, which CI does not have, so these
// checks pin the gate: an anonymous visitor is sent to sign-in, and the body endpoint (a route
// handler, which the admin layout does not cover) refuses to serve task text.
// Request-only tests: no browser is launched.

test("anonymous /admin/tasks redirects to sign-in", async ({ request }) => {
  const res = await request.get("/admin/tasks", { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(res.status());
  expect(res.headers()["location"] ?? "").toContain("/auth/sign-in");
});

test("anonymous task body request is refused", async ({ request }) => {
  const res = await request.get("/admin/tasks/body?key=witus-online%2F141-x.md", { maxRedirects: 0 });
  expect(res.status()).toBe(403);
  expect(await res.text()).not.toContain("plans/user-tasks");
});
