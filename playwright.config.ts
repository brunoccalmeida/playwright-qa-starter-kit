import { fileURLToPath } from 'node:url';
import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env.ts';

// Absolute: Playwright resolves a relative reporter path from the config that
// uses it, and scripts/report-redaction/playwright.config.ts reuses this list.
const redactingReporter = fileURLToPath(
  new URL('./src/reporting/redacting-reporter.ts', import.meta.url),
);
const outputReporters: ReporterDescription[] = env.CI
  ? [['github'], ['list'], ['blob']]
  : [['list']];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A test.only committed by mistake would silently skip the rest of the suite
  forbidOnly: env.CI,
  // Retries diagnose, they do not pass a build (docs/FLAKY_TESTS_PLAYWRIGHT.md): a test
  // that fails and then passes on the same commit is proven flaky in one run,
  // and failOnFlakyTests turns that run red so the flake gets an issue.
  // scripts/check-flaky-policy.ts holds this.
  retries: env.CI ? 2 : 0,
  failOnFlakyTests: env.CI,
  // In CI each job also writes a blob report; the report job merges them
  // into the HTML report published on GitHub Pages (playwright.dev/docs/test-sharding).
  // The redacting reporter comes first, to clean what the others receive.
  reporter: [[redactingReporter], ...outputReporters],
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
