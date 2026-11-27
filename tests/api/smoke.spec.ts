import { test, expect } from '@playwright/test';

// The tracer bullet of ADR 0003: the system under test answers. Replace it
// with the project's first real API test once there is one.
test('the system under test answers', { tag: '@smoke' }, async ({ request }) => {
  await expect(await request.get('/')).toBeOK();
});
