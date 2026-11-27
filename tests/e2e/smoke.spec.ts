import { test, expect } from '@playwright/test';

// The tracer bullet of ADR 0003: a browser opens the system under test.
// Replace it with the project's first real end-to-end test once there is one.
test('the system under test opens in a browser', { tag: '@smoke' }, async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok(), 'GET / did not answer with a success status').toBe(true);
});
