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

/** Marks a listed booking whose guest is the refused request's guest. */
export const SAME_GUEST = ' (same guest as the request)';

/**
 * Creates a booking that the test needs to exist. When the app refuses it,
 * the failure says what was asked for, how long the refusal took and what the
 * room holds at that moment: the app answers a generic 409, and on the shared
 * environment a new room can inherit bookings from an older room with the same
 * id (see the `room` fixture). A slow refusal while the room holds this guest's
 * booking points to the app retrying a POST it had stored (#54).
 */
export async function createBookingOrExplain(
  api: BookingApi,
  booking: NewBooking,
  token: string,
): Promise<Booking> {
  const started = performance.now();
  const response = await api.create(booking);
  if (response.status() !== 201) {
    const elapsed = Math.round(performance.now() - started);
    const { roomid, bookingdates } = booking;
    throw new Error(
      [
        `Expected HTTP 201, received HTTP ${String(response.status())}: ${response.url()}`,
        `Body: ${await response.text()}`,
        `Requested: room ${String(roomid)}, ${bookingdates.checkin} to ${bookingdates.checkout}`,
        `Refused after ${String(elapsed)} ms`,
        await describeRoomBookings(api, booking, token),
      ].join('\n'),
    );
  }
  return expectJson(response, 201, bookingSchema);
}

/**
 * Only ids, dates and whether the guest is the requested one: the report is
 * public and the bookings can be other people's, so guest names stay out.
 * Never fails: losing this detail must not replace the refusal being reported.
 */
async function describeRoomBookings(
  api: BookingApi,
  { roomid, firstname, lastname }: NewBooking,
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
    (listed) =>
      `  #${String(listed.bookingid)}: ${listed.bookingdates.checkin} to ${listed.bookingdates.checkout}` +
      (listed.firstname === firstname && listed.lastname === lastname ? SAME_GUEST : ''),
  );
  return [`${title} (${String(lines.length)}):`, ...lines].join('\n');
}
