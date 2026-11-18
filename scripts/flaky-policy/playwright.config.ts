import { defineConfig } from '@playwright/test';
import base from '../../playwright.config.ts';

// The retry settings come from the real config, unchanged: with retries, the
// probe test turns flaky and only failOnFlakyTests makes the run fail; without
// retries, it fails outright. Either way a flaky test must not pass the gate.
export default defineConfig({
  testDir: import.meta.dirname,
  reporter: 'list',
  ...(base.retries === undefined ? {} : { retries: base.retries }),
  ...(base.failOnFlakyTests === undefined ? {} : { failOnFlakyTests: base.failOnFlakyTests }),
  outputDir: process.env['FLAKY_POLICY_OUTPUT_DIR'] ?? 'test-results',
});
