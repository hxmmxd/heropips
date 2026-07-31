import { defineConfig } from "@playwright/test";

/**
 * E2E suite for heropips.com — marketing site + member platform.
 *
 * The stack is externally managed (no webServer block):
 *   local dev  → `pnpm dev` stack on http://localhost:3100 (default)
 *   docker/CI  → BASE_URL=http://localhost:3000
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",
  fullyParallel: true,
  retries: 1,
  reporter: [["list"]],
  // 60s, not the 30s default: the suite sweeps ~50 routes and several specs
  // walk the whole width matrix. Against `next dev` the first hit on a route
  // also pays for its compile, which alone can exceed 30s on a cold cache.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // Redeems one member via the BFF and saves storageState for platform-app.spec.
    {
      name: "setup",
      testMatch: /platform-app\.setup\.ts/,
    },
    // Desktop: everything.
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /platform-app\.setup\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    // Mobile (iPhone-ish): responsive checks + mobile nav behavior.
    {
      name: "mobile",
      testMatch: [/responsive\.spec\.ts/, /nav\.spec\.ts/],
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
});
