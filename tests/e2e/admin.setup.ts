import { adminCredentials } from '../../src/config/env.ts';
import { ADMIN_SESSION, test as setup } from './fixtures.ts';

// Logs in through the UI once per run and saves the session for the admin
// specs. Not through the API: POST /api/auth/login returns the token in the
// body without a Set-Cookie header; the page's JavaScript writes the `token`
// cookie, so an API login would leave an empty storage state.
setup('authenticate as admin', async ({ page, adminLoginPage, adminRoomsPage }) => {
  await adminLoginPage.goto();
  await adminLoginPage.login(adminCredentials);
  // Wait for the result of the login, not the redirect: see AdminRoomsPage
  await adminRoomsPage.expectLoaded();
  await page.context().storageState({ path: ADMIN_SESSION });
});
