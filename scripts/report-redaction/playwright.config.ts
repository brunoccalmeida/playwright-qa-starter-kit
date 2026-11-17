import { defineConfig } from '@playwright/test';
import base from '../../playwright.config.ts';

// The reporters come from the real config: taking the redacting reporter out
// of it must fail the sentinel.
export default defineConfig({
  testDir: import.meta.dirname,
  reporter: base.reporter ?? 'list',
  retries: 0,
  outputDir: process.env['REDACTION_OUTPUT_DIR'] ?? 'test-results',
  use: { baseURL: process.env['BASE_URL'] ?? '', trace: 'off' },
});
