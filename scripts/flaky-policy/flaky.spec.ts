// Run only by scripts/check-flaky-policy.ts: this test fails on its first
// attempt and passes on the retry, which is what Playwright calls "flaky".
import { expect, test } from '@playwright/test';

test('fails on the first attempt and passes on the retry', () => {
  expect(test.info().retry).toBeGreaterThan(0);
});
