import { expect, type Locator, type Page } from '@playwright/test';

/** The public home page at /. */
export class HomePage {
  /**
   * The room cards, in page order. The cards have no accessible grouping
   * (no list, article or region role) and no test id, so the component
   * class `room-card` is the only container to scope each card's heading,
   * price and link. Inside a card, the locators are user-facing.
   */
  readonly roomCards: Locator;
  private readonly roomsHeading: Locator;

  constructor(private readonly page: Page) {
    this.roomCards = page.locator('.room-card');
    this.roomsHeading = page.getByRole('heading', { name: 'Our Rooms', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.roomsHeading).toBeVisible();
  }
}
