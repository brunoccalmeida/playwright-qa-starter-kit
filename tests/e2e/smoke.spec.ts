import { test, expect } from '@playwright/test';

// Smoke (contract `smoke`, from automation-template): a browser opens the
// target application. Kept next to the real E2E tests: see tests/README.md.
test('the system under test opens in a browser', { tag: '@smoke' }, async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok(), 'GET / did not answer with a success status').toBe(true);
});
