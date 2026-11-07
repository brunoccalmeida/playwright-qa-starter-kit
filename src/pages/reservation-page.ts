import { expect, type Locator, type Page } from '@playwright/test';
import type { NewBooking } from '../api/booking-api.ts';
import type { Stay } from '../api/room-api.ts';

/**
 * A room's reservation page at /reservation/{roomid}. It loads the room
 * from GET /api/room/{id}, broken by KI-1: tests call
 * `serveRoomFromList(page)` before opening it.
 */
export class ReservationPage {
  readonly confirmation: Locator;
  /** The booked dates shown under the confirmation, as `checkin - checkout`. */
  readonly confirmedDates: Locator;
  private readonly reserveNow: Locator;
  private readonly firstname: Locator;
  private readonly lastname: Locator;
  private readonly email: Locator;
  private readonly phone: Locator;

  constructor(private readonly page: Page) {
    this.confirmation = page.getByRole('heading', { name: 'Booking Confirmed', exact: true });
    this.confirmedDates = page.getByText(/^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/);
    this.reserveNow = page.getByRole('button', { name: 'Reserve Now', exact: true });
    this.firstname = page.getByRole('textbox', { name: 'Firstname', exact: true });
    this.lastname = page.getByRole('textbox', { name: 'Lastname', exact: true });
    this.email = page.getByRole('textbox', { name: 'Email', exact: true });
    this.phone = page.getByRole('textbox', { name: 'Phone', exact: true });
  }

  /** Opens the page with the stay preselected: the calendar reads it from the URL. */
  async goto(roomid: number, { checkin, checkout }: Stay): Promise<void> {
    const params = new URLSearchParams({ checkin, checkout });
    await this.page.goto(`/reservation/${String(roomid)}?${params.toString()}`);
    await expect(this.reserveNow).toBeVisible();
  }

  /** The first "Reserve Now" only opens the guest form; the second submits it. */
  async reserve({ firstname, lastname, email, phone }: NewBooking): Promise<void> {
    await this.reserveNow.click();
    await this.firstname.fill(firstname);
    await this.lastname.fill(lastname);
    await this.email.fill(email);
    await this.phone.fill(phone);
    await this.reserveNow.click();
  }
}
