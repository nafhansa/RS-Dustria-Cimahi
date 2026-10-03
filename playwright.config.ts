import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome', viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npm run build && npx astro preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
