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
    // slowMo makes cursor movement and typing legible at watching speed instead of robot speed.
    launchOptions: { slowMo: 350 },
    // Local recording drives installed Chrome (bundled chromium unsupported on macOS 13).
    ...(process.env.CI ? {} : { channel: "chrome" as const }),
  },
  projects: [{ name: "recording", use: { ...devices["Desktop Chrome"] } }],
});
