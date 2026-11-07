// Config for `playwright merge-reports` in the CI report job only.
//
// Each blob records the absolute test directory of the job that wrote it.
// The api job runs on the runner host and the e2e job in the Playwright
// container, with the workspace at different paths, so merge-reports refuses
// to merge them without an explicit testDir (playwright.dev/docs/test-sharding:
// "the merge config file points to the actual tests location").
//
// It does not import playwright.config.ts on purpose: that file validates the
// test credentials on import, and the report job needs none.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
});
