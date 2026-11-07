import { expect, type Locator, type Page } from '@playwright/test';
import { roomListSchema, type NewRoom } from '../api/room-api.ts';

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
  /** The room rows have no table semantics: the test id is the only container. */
  private readonly roomListings: Locator;

  constructor(private readonly page: Page) {
    this.adminNavigation = page
      .getByRole('navigation')
      .getByRole('link', { name: 'Report', exact: true });
    this.roomListings = page.getByTestId('roomlisting');
  }

  /**
   * Opens the page and returns only once it is ready to use: the session
   * proved and the room list rendered. The list renders above the
   * create-room form and pushes it down (about 760 px with 11 rooms), so
   * a click aimed at the form before the list arrives can land on a room
   * row instead (#25: "Clicking the checkbox did not change its state").
   *
   * Ready means the rows on screen match the rooms in the page's own
   * response: the list may be empty in the shared environment, and a
   * second request to the API could see rooms another tester just added.
   */
  async goto(): Promise<void> {
    // Registered before the navigation, or a fast response is missed
    const roomList = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/room',
    );
    // If expectLoaded fails first, the page closes and roomList rejects
    // with nobody awaiting it yet. Marking it handled avoids an unhandled
    // rejection; awaiting it below still throws its own error.
    roomList.catch(() => undefined);
    await this.page.goto('/admin/rooms');
    // Without a session the list never comes: fail on the clearer check
    await this.expectLoaded();
    const { rooms } = roomListSchema.parse(await (await roomList).json());
    await expect(this.roomListings).toHaveCount(rooms.length);
  }

  /**
   * Waits for proof of an admin session, e.g. after a UI login. It does not
   * wait for the room list: to use the page, open it with goto().
   */
  async expectLoaded(): Promise<void> {
    await expect(this.adminNavigation).toBeVisible();
    await expect(this.page).toHaveURL(/\/admin\/rooms$/);
  }

  /** A room in the list, by its unique name (the rows have no table semantics). */
  room(roomName: string): Locator {
    return this.page.getByText(roomName, { exact: true });
  }

  /** A room's whole row, to check its other columns. */
  listing(roomName: string): Locator {
    return this.roomListings.filter({ has: this.room(roomName) });
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
