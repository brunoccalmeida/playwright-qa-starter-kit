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
  reporter: env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: env.BASE_URL,
    // A trace stores every request body, including the login credentials,
    // in plain text; secret masking covers CI logs, not artifacts. Traces
    // stay local; in CI, expectJson's failure message (URL + response body)
    // is the diagnostic. In the browser the trace would also hold the
    // password typed into the login form and the admin session cookie.
    trace: env.CI ? 'off' : 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    // Logs in once and saves the admin session (playwright.dev/docs/auth)
    {
      name: 'setup',
      testDir: './tests/e2e',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
