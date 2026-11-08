import type { APIResponse } from '@playwright/test';
import { BookingApi, bookingListSchema, bookingSchema } from '../../src/api/booking-api.ts';
import { createBookingOrExplain } from '../../src/api/create-booking.ts';
import { expectJson, expectStatus } from '../../src/api/expect-json.ts';
import { errorListSchema, errorSchema } from '../../src/api/schemas.ts';
import { futureStay, newBooking, stayAfter } from '../../src/data/factories.ts';
import { expect, knownIssue, test } from '../fixtures.ts';

test.describe('POST /api/booking', () => {
  test('creates a booking and echoes it back', async ({ createBooking, room }) => {
    const booking = newBooking(room.roomid, futureStay());

    const body = await createBooking(booking);

    expect(body).toMatchObject({
      roomid: booking.roomid,
      firstname: booking.firstname,
      lastname: booking.lastname,
      depositpaid: booking.depositpaid,
      bookingdates: booking.bookingdates,
    });
  });

  test('rejects an overlapping booking with 409', async ({ bookingApi, createBooking, room }) => {
    const stay = futureStay(3);
    await createBooking(newBooking(room.roomid, stay));

    // Starts on the second night of the first stay
    const overlapping = stayAfter(stay, -2);
    const response = await bookingApi.create(newBooking(room.roomid, overlapping));

    const body = await expectJson(response, 409, errorSchema);
    expect(body.error).toBe('Failed to create booking');
  });

  test('accepts a check-in on the previous check-out day', async ({ createBooking, room }) => {
    const stay = futureStay();
    await createBooking(newBooking(room.roomid, stay));

    const next = newBooking(room.roomid, stayAfter(stay));

    expect(await createBooking(next)).toMatchObject({ bookingdates: next.bookingdates });
  });

  test('explains a refused booking without exposing guest data or the token', async ({
    createBooking,
    room,
    adminToken,
  }) => {
    const stay = futureStay(3);
    const first = await createBooking(newBooking(room.roomid, stay));
    const clash = newBooking(room.roomid, stay);

    const failure = await createBooking(clash).then(
      () => 'created',
      (error: unknown) => String(error),
    );

    expect(failure).toContain('HTTP 409');
    expect(failure).toContain(
      `Requested: room ${String(room.roomid)}, ${stay.checkin} to ${stay.checkout}`,
    );
    expect(failure).toContain(`#${String(first.bookingid)}: ${stay.checkin} to ${stay.checkout}`);
    expect(failure).not.toContain(first.lastname);
    expect(failure).not.toContain(clash.lastname);
    expect(failure).not.toContain(clash.email);
    expect(failure).not.toContain(adminToken);
  });

  test('keeps the refusal and hides the token when the room cannot be listed', async ({
    request,
    createBooking,
    room,
    adminToken,
  }) => {
    // A failed request's call log lists its headers, the token cookie included
    class ListingFails extends BookingApi {
      override listByRoom(): Promise<APIResponse> {
        return Promise.reject(new Error(`Cookie: token=${adminToken}`));
      }
    }
    const stay = futureStay(3);
    await createBooking(newBooking(room.roomid, stay));

    const failure = await createBookingOrExplain(
      new ListingFails(request),
      newBooking(room.roomid, stay),
      adminToken,
    ).then(
      () => 'created',
      (error: unknown) => String(error),
    );

    expect(failure).toContain('HTTP 409');
    expect(failure).toContain('could not be listed');
    expect(failure).not.toContain(adminToken);
  });

  test('rejects names outside the allowed length with 400', async ({ bookingApi, room }) => {
    const booking = { ...newBooking(room.roomid, futureStay()), firstname: 'Al', lastname: 'Bo' };

    const body = await expectJson(await bookingApi.create(booking), 400, errorListSchema);

    expect(body.errors).toEqual(
      expect.arrayContaining(['size must be between 3 and 30', 'size must be between 3 and 18']),
    );
  });

  test.fail(
    'rejects a check-out before the check-in with 400',
    knownIssue('KI-4'),
    async ({ bookingApi, room }) => {
      const { checkin, checkout } = futureStay();
      const reversed = { checkin: checkout, checkout: checkin };

      const response = await bookingApi.create(newBooking(room.roomid, reversed));

      // The fixed response is unknown: assert only the status (not even JSON)
      await expectStatus(response, 400);
    },
  );
});

test.describe('GET /api/booking?roomid=', () => {
  test("lists the room's bookings for an admin", async ({
    bookingApi,
    createBooking,
    room,
    adminToken,
  }) => {
    const created = await createBooking(newBooking(room.roomid, futureStay()));

    const response = await bookingApi.listByRoom(room.roomid, adminToken);

    const { bookings } = await expectJson(response, 200, bookingListSchema);
    // Not toEqual([created]): the shared environment reuses room ids after a
    // cleanup and keeps the old bookings, so a new room may already have some
    expect(bookings).toContainEqual(created);
  });

  test('requires authentication', async ({ bookingApi, room }) => {
    const response = await bookingApi.listByRoom(room.roomid);

    const body = await expectJson(response, 401, errorSchema);
    expect(body.error).toBe('Authentication required');
  });
});

test.describe('GET /api/booking/{id}', () => {
  test.fail(
    'returns the booking',
    knownIssue('KI-1'),
    async ({ bookingApi, createBooking, room, adminToken }) => {
      const created = await createBooking(newBooking(room.roomid, futureStay()));

      const response = await bookingApi.get(created.bookingid, adminToken);

      const body = await expectJson(response, 200, bookingSchema);
      expect(body).toEqual(created);
    },
  );
});
