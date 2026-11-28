import { AdminLoginPage } from '../../src/pages/admin-login-page.ts';
import { AdminRoomsPage } from '../../src/pages/admin-rooms-page.ts';
import { HomePage } from '../../src/pages/home-page.ts';
import { ReservationPage } from '../../src/pages/reservation-page.ts';
import { test as apiTest } from '../fixtures.ts';

export { knownIssue } from '../fixtures.ts';

type PageFixtures = {
  homePage: HomePage;
  adminLoginPage: AdminLoginPage;
  adminRoomsPage: AdminRoomsPage;
  reservationPage: ReservationPage;
};

// Extends the API fixtures: browser tests arrange their data through the
// API (fast, no UI coupling) and assert what the user sees.
export const test = apiTest.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  adminLoginPage: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },
  adminRoomsPage: async ({ page }, use) => {
    await use(new AdminRoomsPage(page));
  },
  reservationPage: async ({ page }, use) => {
    await use(new ReservationPage(page));
  },
});

/**
 * Tests run as a guest by default; an admin spec imports `adminTest`
 * instead, and each of its tests opens the browser with its own admin
 * session: the `token` cookie the login page would write, from the test's
 * fresh `adminToken`. Not one session saved per run: the shared
 * environment's auth reset deletes every token, and a saved session then
 * sends every later admin test, retries included, to the login page (#70).
 * The cookie is set here because the login API returns the token in the
 * body with no Set-Cookie header; the UI login has its own spec.
 *
 * On `context`, not `storageState`: the built-in `request` gets its
 * baseURL from an automatic fixture that depends on `storageState`, so an
 * override of it that logs in runs before that and sends a relative URL
 * (read in Playwright 1.65.1).
 */
export const adminTest = test.extend({
  context: async ({ context, adminToken, baseURL }, use) => {
    if (baseURL === undefined) {
      throw new Error('baseURL is not set: the admin session cookie needs its URL');
    }
    await context.addCookies([{ name: 'token', value: adminToken, url: baseURL }]);
    await use(context);
  },
});

export { expect } from '@playwright/test';
