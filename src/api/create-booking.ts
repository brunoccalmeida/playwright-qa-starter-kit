import type { APIResponse } from '@playwright/test';
import { z } from 'zod';
import {
  bookingListSchema,
  bookingSchema,
  type BookingApi,
  type NewBooking,
} from './booking-api.ts';
import { expectJson } from './expect-json.ts';

type Booking = z.infer<typeof bookingSchema>;

/**
 * Creates a booking that the test needs to exist. When the app refuses it,
 * the failure says what was asked for and what the room holds at that moment:
 * the app answers a generic 409, and on the shared environment a new room can
 * inherit bookings from an older room with the same id (see the `room` fixture).
 */
export async function createBookingOrExplain(
  api: BookingApi,
  booking: NewBooking,
  token: string,
): Promise<Booking> {
  const response = await api.create(booking);
  if (response.status() !== 201) {
    const { roomid, bookingdates } = booking;
    throw new Error(
      [
        `Expected HTTP 201, received HTTP ${String(response.status())}: ${response.url()}`,
        `Body: ${await response.text()}`,
        `Requested: room ${String(roomid)}, ${bookingdates.checkin} to ${bookingdates.checkout}`,
        await describeRoomBookings(api, roomid, token),
      ].join('\n'),
    );
  }
  return expectJson(response, 201, bookingSchema);
}

/**
 * Only ids and dates: the report is public and the bookings can be other
 * people's, so guest names stay out. Never fails: losing this detail must not
 * replace the refusal being reported.
 */
async function describeRoomBookings(
  api: BookingApi,
  roomid: number,
  token: string,
): Promise<string> {
  const title = `Bookings of room ${String(roomid)} now`;
  let response: APIResponse;
  try {
    response = await api.listByRoom(roomid, token);
  } catch {
    // The error is left out on purpose: Playwright's call log of a failed
    // request lists the request headers, and this one carries the token.
    return `${title}: could not be listed (the request failed)`;
  }

  const parsed = bookingListSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok() || !parsed.success) {
    return `${title}: could not be listed (HTTP ${String(response.status())})`;
  }

  const lines = parsed.data.bookings.map(
    ({ bookingid, bookingdates: { checkin, checkout } }) =>
      `  #${String(bookingid)}: ${checkin} to ${checkout}`,
  );
  return [`${title} (${String(lines.length)}):`, ...lines].join('\n');
}
