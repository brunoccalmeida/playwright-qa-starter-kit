import { test, expect } from '@playwright/test';

// Smoke (contract `smoke`, from automation-template): the target application
// answers. Kept next to the real API tests: see tests/README.md.
test('the system under test answers', { tag: '@smoke' }, async ({ request }) => {
  await expect(await request.get('/')).toBeOK();
});
