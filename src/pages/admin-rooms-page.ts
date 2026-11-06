import { expect, type Locator, type Page } from '@playwright/test';

/** Room management at /admin/rooms (requires an admin session). */
export class AdminRoomsPage {
  /**
   * Proof of an admin session. Not the URL nor the room form: without a
   * session, /admin/rooms keeps its URL and may render the form for a moment
   * before redirecting to the login. Not the Logout button either: the
   * login page shows it too. The admin links (Report, Branding...) appear
   * only for an authenticated user.
   */
  private readonly adminNavigation: Locator;

  constructor(private readonly page: Page) {
    this.adminNavigation = page
      .getByRole('navigation')
      .getByRole('link', { name: 'Report', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/rooms');
  }

  /** Waits for the authenticated room list, not an intermediate state. */
  async expectLoaded(): Promise<void> {
    await expect(this.adminNavigation).toBeVisible();
    await expect(this.page).toHaveURL(/\/admin\/rooms$/);
  }

  /** A room in the list, by its unique name (the rows have no table semantics). */
  room(roomName: string): Locator {
    return this.page.getByText(roomName, { exact: true });
  }
}
