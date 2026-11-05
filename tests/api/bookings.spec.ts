import { bookingListSchema, bookingSchema } from '../../src/api/booking-api.ts';
import { expectJson } from '../../src/api/expect-json.ts';
import { errorListSchema, errorSchema } from '../../src/api/schemas.ts';
import { futureStay, newBooking, stayAfter } from '../../src/data/factories.ts';
import { expect, KNOWN_ISSUES, test } from '../fixtures.ts';
import { z } from 'zod';

test.describe('POST /api/booking', () => {
  test('creates a booking and echoes it back', async ({ bookingApi, room }) => {
    const booking = newBooking(room.roomid, futureStay());

    const body = await expectJson(await bookingApi.create(booking), 201, bookingSchema);

    expect(body).toMatchObject({
      roomid: booking.roomid,
      firstname: booking.firstname,
      lastname: booking.lastname,
      depositpaid: booking.depositpaid,
      bookingdates: booking.bookingdates,
    });
  });

  test('rejects an overlapping booking with 409', async ({ bookingApi, room }) => {
    const stay = futureStay(3);
    await expectJson(await bookingApi.create(newBooking(room.roomid, stay)), 201, bookingSchema);

    // Starts on the second night of the first stay
    const overlapping = stayAfter(stay, -2);
    const response = await bookingApi.create(newBooking(room.roomid, overlapping));

    const body = await expectJson(response, 409, errorSchema);
    expect(body.error).toBe('Failed to create booking');
  });

  test('accepts a check-in on the previous check-out day', async ({ bookingApi, room }) => {
    const stay = futureStay();
    await expectJson(await bookingApi.create(newBooking(room.roomid, stay)), 201, bookingSchema);

    const response = await bookingApi.create(newBooking(room.roomid, stayAfter(stay)));

    await expectJson(response, 201, bookingSchema);
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
    {
      annotation: {
        type: 'issue',
        description: `${KNOWN_ISSUES}#ki-4-check-out-before-check-in-returns-409`,
      },
    },
    async ({ bookingApi, room }) => {
      const { checkin, checkout } = futureStay();
      const reversed = { checkin: checkout, checkout: checkin };

      const response = await bookingApi.create(newBooking(room.roomid, reversed));

      // The error format of the fixed endpoint is unknown: only the status matters here
      await expectJson(response, 400, z.unknown());
    },
  );
});

test.describe('GET /api/booking?roomid=', () => {
  test("lists the room's bookings for an admin", async ({ bookingApi, room, adminToken }) => {
    const created = await expectJson(
      await bookingApi.create(newBooking(room.roomid, futureStay())),
      201,
      bookingSchema,
    );

    const response = await bookingApi.listByRoom(room.roomid, adminToken);

    const { bookings } = await expectJson(response, 200, bookingListSchema);
    expect(bookings).toEqual([created]);
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
    { annotation: { type: 'issue', description: `${KNOWN_ISSUES}#ki-1-get-by-id-returns-500` } },
    async ({ bookingApi, room, adminToken }) => {
      const created = await expectJson(
        await bookingApi.create(newBooking(room.roomid, futureStay())),
        201,
        bookingSchema,
      );

      const response = await bookingApi.get(created.bookingid, adminToken);

      const body = await expectJson(response, 200, bookingSchema);
      expect(body).toEqual(created);
    },
  );
});
