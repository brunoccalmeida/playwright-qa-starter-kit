import type { APIResponse } from '@playwright/test';
import { BookingApi, bookingListSchema, bookingSchema } from '../../src/api/booking-api.ts';
import { createBookingOrExplain, SAME_GUEST } from '../../src/api/create-booking.ts';
import { expectJson, expectStatus } from '../../src/api/expect-json.ts';
import { errorListSchema, errorSchema } from '../../src/api/schemas.ts';
import { futureStay, newBooking, newGuestBooking, stayAfter } from '../../src/data/factories.ts';
import { expect, knownIssue, test } from '../fixtures.ts';

test.describe('POST /ui-api/booking', () => {
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

  test('rejects an overlapping booking with 409', async ({
    bookingApi,
    createBooking,
    deleteBookingAfterTest,
    room,
  }) => {
    const stay = futureStay(3);
    await createBooking(newBooking(room.roomid, stay));

    // Starts on the second night of the first stay
    const overlapping = newBooking(room.roomid, stayAfter(stay, -2));
    deleteBookingAfterTest(overlapping);
    const response = await bookingApi.create(overlapping);

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
    const clash = newGuestBooking(room.roomid, stay);

    const failure = await createBooking(clash).then(
      () => 'created',
      (error: unknown) => String(error),
    );

    expect(failure).toContain('HTTP 409');
    expect(failure).toContain(
      `Requested: room ${String(room.roomid)}, ${stay.checkin} to ${stay.checkout}`,
    );
    expect(failure).toMatch(/Refused after \d+ ms/);
    expect(failure).toContain(`#${String(first.bookingid)}: ${stay.checkin} to ${stay.checkout}`);
    expect(failure).not.toContain(SAME_GUEST);
    expect(failure).not.toContain(first.lastname);
    expect(failure).not.toContain(clash.lastname);
    expect(failure).not.toContain(clash.email);
    expect(failure).not.toContain(adminToken);
  });

  // The app can store a booking and still answer 409 (KI-8): this mark tells
  // that case apart from a clash with someone else's booking
  test('marks a booking the room already holds for the refused guest', async ({
    createBooking,
    room,
  }) => {
    const booking = newBooking(room.roomid, futureStay());
    const first = await createBooking(booking);

    const failure = await createBooking(booking).then(
      () => 'created',
      (error: unknown) => String(error),
    );

    const { checkin, checkout } = booking.bookingdates;
    expect(failure).toContain(
      `#${String(first.bookingid)}: ${checkin} to ${checkout}${SAME_GUEST}`,
    );
    expect(failure).not.toContain(booking.lastname);
  });

  test('keeps the refusal and hides the token when the room cannot be listed', async ({
    request,
    createBooking,
    deleteBookingAfterTest,
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
    const clash = newBooking(room.roomid, stay);
    deleteBookingAfterTest(clash);

    const failure = await createBookingOrExplain(new ListingFails(request), clash, adminToken).then(
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

  test(
    'does not refuse a booking it stored',
    knownIssue('KI-8'),
    async ({ bookingApi, deleteBookingAfterTest, room, adminToken }) => {
      // Valid for the booking service, one character too long for the message
      // service's 255-character email column: the guest's message fails after
      // the booking is stored, and the UI API's retry is refused as a clash
      const domain = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.example.com`;
      const email = `${'d'.repeat(256 - 1 - domain.length)}@${domain}`;
      const booking = { ...newGuestBooking(room.roomid, futureStay()), email };
      deleteBookingAfterTest(booking);

      const response = await bookingApi.create(booking);

      const listed = await bookingApi.listByRoom(room.roomid, adminToken);
      const { bookings } = await expectJson(listed, 200, bookingListSchema);
      const outcome = {
        status: response.status(),
        stored: bookings.some(({ lastname }) => lastname === booking.lastname),
      };
      test.fail();
      // Accepting the address or rejecting it both fix the bug; refusing the
      // request while keeping the booking does not
      expect(
        [
          { status: 201, stored: true },
          { status: 400, stored: false },
        ],
        'the response must say whether the booking was stored',
      ).toContainEqual(outcome);
    },
  );

  test(
    'rejects a check-out before the check-in with 400',
    knownIssue('KI-4'),
    async ({ bookingApi, deleteBookingAfterTest, room }) => {
      const { checkin, checkout } = futureStay();
      const reversed = newBooking(room.roomid, { checkin: checkout, checkout: checkin });
      deleteBookingAfterTest(reversed);

      const response = await bookingApi.create(reversed);

      test.fail();
      // The fixed response is unknown: assert only the status (not even JSON)
      await expectStatus(response, 400);
    },
  );
});

test.describe('GET /ui-api/booking?roomid=', () => {
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

test.describe('GET /ui-api/booking/{id}', () => {
  test('returns the booking', async ({ bookingApi, createBooking, room, adminToken }) => {
    const created = await createBooking(newBooking(room.roomid, futureStay()));

    const response = await bookingApi.get(created.bookingid, adminToken);

    const body = await expectJson(response, 200, bookingSchema);
    expect(body).toEqual(created);
  });
});
