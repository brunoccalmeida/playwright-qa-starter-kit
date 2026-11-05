import {
  logoutResponseSchema,
  tokenResponseSchema,
  validateResponseSchema,
} from '../../src/api/auth-api.ts';
import { expectJson } from '../../src/api/expect-json.ts';
import { errorSchema } from '../../src/api/schemas.ts';
import { adminCredentials } from '../../src/config/env.ts';
import { expect, KNOWN_ISSUES, test } from '../fixtures.ts';

test.describe('POST /api/auth/login', () => {
  test('returns a token for valid credentials', async ({ authApi }) => {
    const response = await authApi.login(adminCredentials);

    await expectJson(response, 200, tokenResponseSchema);
  });

  test('rejects a wrong password with 401', async ({ authApi }) => {
    const response = await authApi.login({
      username: adminCredentials.username,
      password: `${adminCredentials.password}-wrong`,
    });

    const body = await expectJson(response, 401, errorSchema);
    expect(body.error).toBe('Invalid credentials');
  });
});

test.describe('POST /api/auth/validate', () => {
  test('accepts a token issued by login', async ({ authApi, adminToken }) => {
    const response = await authApi.validate(adminToken);

    const body = await expectJson(response, 200, validateResponseSchema);
    expect(body.valid).toBe(true);
  });

  test('rejects an unknown token with 403', async ({ authApi }) => {
    const response = await authApi.validate(`unknown-${crypto.randomUUID()}`);

    const body = await expectJson(response, 403, errorSchema);
    expect(body.error).toBe('Invalid token');
  });

  test('rejects an empty token with 401', async ({ authApi }) => {
    const response = await authApi.validate('');

    const body = await expectJson(response, 401, errorSchema);
    expect(body.error).toBe('No token provided');
  });
});

test.describe('POST /api/auth/logout', () => {
  test('confirms the logout', async ({ authApi, adminToken }) => {
    const response = await authApi.logout(adminToken);

    const body = await expectJson(response, 200, logoutResponseSchema);
    expect(body.success).toBe(true);
  });

  test.fail(
    'invalidates the token',
    {
      annotation: {
        type: 'issue',
        description: `${KNOWN_ISSUES}#ki-3-logout-does-not-invalidate-the-token`,
      },
    },
    async ({ authApi, adminToken }) => {
      await expectJson(await authApi.logout(adminToken), 200, logoutResponseSchema);

      const response = await authApi.validate(adminToken);

      await expectJson(response, 403, errorSchema);
    },
  );
});
