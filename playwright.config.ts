import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env.ts';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A test.only committed by mistake would silently skip the rest of the suite
  forbidOnly: env.CI,
  // The target app is a shared public environment: retry transient network
  // failures in CI. Playwright still reports a test that passed on retry as
  // "flaky", so instability stays visible instead of hidden.
  retries: env.CI ? 2 : 0,
  // In CI each job also writes a blob report; the report job merges them
  // into the HTML report published on GitHub Pages (playwright.dev/docs/test-sharding).
  reporter: env.CI ? [['github'], ['list'], ['blob']] : 'list',
  use: {
    baseURL: env.BASE_URL,
    // A trace stores every request body, including the login credentials,
    // in plain text, plus the admin session cookie. The report is public,
    // so traces stay local; in CI the screenshot and expectJson's failure
    // message (URL + response body) are the diagnostic.
    trace: env.CI ? 'off' : 'retain-on-failure',
    // A password field renders as dots: a screenshot does not show it
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    // Logs in once and saves the admin session (playwright.dev/docs/auth).
    // The session is a cookie, valid in any browser: one login for both.
    {
      name: 'setup',
      testDir: './tests/e2e',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
