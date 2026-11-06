import { expect, type Locator, type Page } from '@playwright/test';
import type { NewRoom } from '../api/room-api.ts';

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

  /**
   * A room's whole row, to check its other columns. The rows have no table
   * semantics, so the test id is the only container.
   */
  listing(roomName: string): Locator {
    return this.page.getByTestId('roomlisting').filter({ has: this.room(roomName) });
  }

  /**
   * Fills the create-room form and submits it. Only the room name has a
   * test id, and no field has an accessible name (KI-5): the others are
   * found by their `id`, the attribute a fixed `<label for>` would point
   * to. A positional locator (the n-th combobox) would break silently if
   * the columns were reordered.
   */
  async createRoom({ roomName, type, accessible, roomPrice, features }: NewRoom): Promise<void> {
    await this.page.getByTestId('roomName').fill(roomName);
    await this.page.locator('#type').selectOption(type);
    await this.page.locator('#accessible').selectOption(String(accessible));
    await this.page.locator('#roomPrice').fill(String(roomPrice));
    for (const feature of features) {
      await this.page.getByRole('checkbox', { name: feature, exact: true }).check();
    }
    await this.page.getByRole('button', { name: 'Create', exact: true }).click();
  }
}
