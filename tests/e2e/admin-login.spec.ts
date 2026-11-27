import { adminCredentials } from '../../src/config/env.ts';
import { expect, test } from './fixtures.ts';

test.describe('Admin login', () => {
  test('valid credentials open the room management', async ({ adminLoginPage, adminRoomsPage }) => {
    await adminLoginPage.goto();
    await adminLoginPage.login(adminCredentials);

    await adminRoomsPage.expectLoaded();
  });

  test('wrong password shows an error and stays on the login form', async ({ adminLoginPage }) => {
    await adminLoginPage.goto();
    const response = await adminLoginPage.login({
      ...adminCredentials,
      password: 'wrong-password',
    });

    expect(response.status()).toBe(401);
    await expect(adminLoginPage.error).toHaveText('Invalid credentials');
    await expect(adminLoginPage.heading).toBeVisible();
  });
});
