// Run only by scripts/check-report-redaction.ts: both tests fail on purpose,
// so that the call log of a failed request reaches the reporters.
import { test } from '@playwright/test';

const token = process.env['REDACTION_PROBE_TOKEN'] ?? '';
const headers = {
  Cookie: `token=${token}`,
  Authorization: `Bearer ${token}`,
  'X-Unlisted-Header': token,
};

test('a request that fails at the network level', async ({ request }) => {
  await request.get('/drop-connection', { headers });
});

test('a response that fails the request', async ({ request }) => {
  await request.get('/server-error', { headers, failOnStatusCode: true });
});

test('a failure wrapped as the cause of another error', async ({ request }) => {
  await request.get('/drop-connection', { headers }).catch((error: unknown) => {
    throw new Error('Wrapped by the test', { cause: error });
  });
});

test('a failure rethrown as a string', async ({ request }) => {
  await request.get('/drop-connection', { headers }).catch((error: unknown) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- reaches TestError.value, the path under test
    throw String(error);
  });
});
