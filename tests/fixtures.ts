import { test as base } from '@playwright/test';
import { AuthApi, tokenResponseSchema } from '../src/api/auth-api.ts';
import { expectJson } from '../src/api/expect-json.ts';
import { adminCredentials } from '../src/config/env.ts';

type ApiFixtures = {
  authApi: AuthApi;
  /** A fresh admin token per test: logging out in one test cannot affect another. */
  adminToken: string;
};

export const test = base.extend<ApiFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApi(request));
  },
  adminToken: async ({ authApi }, use) => {
    const { token } = await expectJson(
      await authApi.login(adminCredentials),
      200,
      tokenResponseSchema,
    );
    await use(token);
  },
});

export { expect } from '@playwright/test';
