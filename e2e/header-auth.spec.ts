import { test, expect } from "@playwright/test";

// Guard for the header's sign-in control (docs/shared-ui-ux-dx.md, "Sign-in control"). Tagged
// @smoke so the production job in .github/workflows/e2e.yml asserts it after every production
// deployment, and the preview job on every push. History: the control was renamed to "Apps" on
// 2026-05-13 and the site shipped for five months with no visible way to sign in; BAM reported it
// on 2026-10-16 as a repeat. If this test fails, the control was removed or renamed; put it back.

test("@smoke header shows a Sign in link to a visitor who is not signed in", async ({ page }) => {
  await page.goto("/");
  const signIn = page.getByRole("navigation", { name: /primary/i }).getByRole("link", { name: /^sign in$/i });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", /\/auth\/sign-in$/);
  // The hub link stays alongside it; both audiences need /account.
  await expect(page.getByRole("navigation", { name: /primary/i }).getByRole("link", { name: /^apps$/i })).toBeVisible();
});

test("@smoke the sign-in link lands on a page with a sign-in form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: /primary/i }).getByRole("link", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
});
