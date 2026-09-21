import { defineConfig, devices } from "@playwright/test";

// Recording profile for tutorials (plan 30 §8.3). Deliberately separate from playwright.config.ts:
// the CI gate wants speed and parallelism; a recording wants one worker, deliberate pacing, a fixed
// 1280×720 frame, and video on. Run with:
//   PLAYWRIGHT_BASE_URL=https://<host> npx playwright test --config playwright.tutorial.config.ts
// Output lands in tutorial-output/<slug>/ (see e2e/tutorials/tutorial.ts for the contract).
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/tutorials",
  testMatch: "**/*.tutorial.ts",
  timeout: 180_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    video: { mode: "on", size: { width: 1280, height: 720 } },
    // Recording sessions are synthetic traffic too — same tag as the CI suite, so Honeycomb and
    // analytics can separate tutorial takes from real users (tag, not a drop: traces still flow).
    extraHTTPHeaders: { "x-witus-origin-test": "playwright-synthetic" },
    // slowMo is OFF by default, deliberately. It delays every browser protocol message, and the
    // screencast frames the recorder is built from are protocol messages: at slowMo 350 the webm
    // dropped to a few frames a second, lost whole stretches of wall time, and missed two of the
    // four 240 ms boundary flashes (measured 2026-09-21), so steps were cut in the wrong places.
    // Pace a tutorial inside its steps instead — page.waitForTimeout(), or
    // locator.pressSequentially(text, { delay }) for typing that should be readable.
    // TUTORIAL_SLOWMO exists for debugging a spec by eye, never for a take you will publish.
    launchOptions: { slowMo: Number(process.env.TUTORIAL_SLOWMO ?? 0) },
    // Local recording drives installed Chrome (bundled chromium unsupported on macOS 13).
    ...(process.env.CI ? {} : { channel: "chrome" as const }),
  },
  projects: [{ name: "recording", use: { ...devices["Desktop Chrome"] } }],
});
