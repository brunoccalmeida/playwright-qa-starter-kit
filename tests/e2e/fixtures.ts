import { fileURLToPath } from 'node:url';
import { AdminLoginPage } from '../../src/pages/admin-login-page.ts';
import { AdminRoomsPage } from '../../src/pages/admin-rooms-page.ts';
import { HomePage } from '../../src/pages/home-page.ts';
import { ReservationPage } from '../../src/pages/reservation-page.ts';
import { test as apiTest } from '../fixtures.ts';

export { KNOWN_ISSUES } from '../fixtures.ts';

/**
 * The admin session saved by admin.setup.ts. Tests run as a guest by
 * default; an admin spec opts in with `test.use({ storageState: ADMIN_SESSION })`.
 * The file grants access to the admin account: it is ignored by Git.
 */
export const ADMIN_SESSION = fileURLToPath(
  new URL('../../playwright/.auth/admin.json', import.meta.url),
);

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

export { expect } from '@playwright/test';
