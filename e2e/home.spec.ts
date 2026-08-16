import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

// Happy path + a11y gate for the public marketing surface (plan 30 Phase 2; a11y mandate from
// docs/shared-ui-ux-dx.md). Kept to stable public pages on purpose — deep flows arrive with the
// Phase 3 tutorial specs; this gate's job is "the site renders, navigates, and stays accessible".

/** Gate on serious+critical axe violations. Minor/moderate findings are reported in the failure
 *  message when the gate trips, but don't fail the build on their own — the charter's bar is
 *  WCAG AA, and axe's minor findings routinely include below-AA nitpicks that would make the
 *  gate flaky-red and get ignored. Tighten later if the pages stay clean. */
async function expectNoSeriousA11yViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const gating = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    gating.map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} nodes)`),
  ).toEqual([]);
}

test("homepage renders and is accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("primary nav reaches the learn section", async ({ page }) => {
  await page.goto("/");
  // Semantic link copy is a charter rule — target the destination by accessible name, not by CSS.
  await page.getByRole("link", { name: /learn/i }).first().click();
  await expect(page).toHaveURL(/\/learn/);
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});
