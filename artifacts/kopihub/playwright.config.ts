import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config untuk E2E POS UMKMgo.
 *
 * Jalankan:
 *   pnpm --filter @workspace/kopihub exec playwright install chromium
 *   pnpm --filter @workspace/kopihub test:e2e
 *
 * Catatan: window.print() & window.open() di-mock dalam tiap test
 * (lihat e2e/fixtures.ts) supaya tidak memunculkan dialog cetak.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
