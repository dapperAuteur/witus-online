import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Pipeline-proving demo tutorial: a short tour of witus.online. The three launch tutorials (Learn
// purchase, FlashLearn deck, Inbox submission — narration in plans/31) live in their own repos and
// follow this exact shape once their Playwright branches merge. Narration here is real and
// recordable, but this flow's first job is to exercise the harness end to end.

defineTutorial(
  { slug: "witus-tour", title: "Meet the WitUS ecosystem" },
  [
    {
      title: "The front door",
      narration:
        "This is witus dot online — the front door of the WitUS ecosystem. One philosophy, live long and work free, and every tool we build hangs off it.",
      action: async (page) => {
        await expect(page.locator("h1").first()).toBeVisible();
      },
    },
    {
      title: "The product directory",
      narration:
        "Scroll down and you'll find the product directory — every WitUS app in one place, each with its own color and its own job. One account signs you into all of them.",
      action: async (page) => {
        const products = page.locator('section[aria-labelledby="products-heading"]');
        await products.scrollIntoViewIfNeeded();
        await expect(products).toBeVisible();
      },
    },
    {
      title: "The learn section",
      narration:
        "And behind the products there's a practitioner — the learn section carries the curriculum, the research, and the partnerships the whole ecosystem is built on.",
      action: async (page) => {
        await page.getByRole("link", { name: /learn/i }).first().click();
        await expect(page).toHaveURL(/\/learn/);
        await expect(page.locator("h1").first()).toBeVisible();
      },
    },
  ],
);
