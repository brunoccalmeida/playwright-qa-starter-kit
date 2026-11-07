import { expect, type Locator, type Page } from '@playwright/test';
import type { NewMessage } from '../api/message-api.ts';

/** The public home page at /, with the contact form. */
export class HomePage {
  /**
   * The room cards, in page order. The cards have no accessible grouping
   * (no list, article or region role) and no test id, so the component
   * class `room-card` is the only container to scope each card's heading,
   * price and link. Inside a card, the locators are user-facing.
   */
  readonly roomCards: Locator;
  private readonly roomsHeading: Locator;
  private readonly contactName: Locator;
  private readonly contactEmail: Locator;
  private readonly contactPhone: Locator;
  private readonly contactSubject: Locator;
  /**
   * By test id: the "Message" label points to `#message`, but the textarea
   * is `#description`, so the field has no accessible name (KI-5).
   */
  private readonly contactMessage: Locator;
  private readonly contactSubmit: Locator;

  constructor(private readonly page: Page) {
    this.roomCards = page.locator('.room-card');
    this.roomsHeading = page.getByRole('heading', { name: 'Our Rooms', exact: true });
    this.contactName = page.getByLabel('Name', { exact: true });
    this.contactEmail = page.getByLabel('Email', { exact: true });
    this.contactPhone = page.getByLabel('Phone', { exact: true });
    this.contactSubject = page.getByLabel('Subject', { exact: true });
    this.contactMessage = page.getByTestId('ContactDescription');
    this.contactSubmit = page.getByRole('button', { name: 'Submit', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.roomsHeading).toBeVisible();
  }

  async sendMessage({ name, email, phone, subject, description }: NewMessage): Promise<void> {
    await this.contactName.fill(name);
    await this.contactEmail.fill(email);
    await this.contactPhone.fill(phone);
    await this.contactSubject.fill(subject);
    await this.contactMessage.fill(description);
    await this.contactSubmit.click();
  }

  /** Replaces the form once the message is sent. */
  contactConfirmation(name: string): Locator {
    return this.page.getByRole('heading', {
      name: `Thanks for getting in touch ${name}!`,
      exact: true,
    });
  }
}
