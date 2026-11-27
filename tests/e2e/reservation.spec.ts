import { bookingListSchema } from '../../src/api/booking-api.ts';
import { expectFound, expectJson } from '../../src/api/expect-json.ts';
import { futureStay, newBooking } from '../../src/data/factories.ts';
import { expect, test } from './fixtures.ts';

test.describe('Room reservation', () => {
  test('a guest books a room for the chosen dates', async ({
    room,
    reservationPage,
    bookingApi,
    adminToken,
  }) => {
    const booking = newBooking(room.roomid, futureStay());

    await reservationPage.goto(room.roomid, booking.bookingdates);
    await reservationPage.reserve(booking);

    await expect(reservationPage.confirmation).toBeVisible();
    const { checkin, checkout } = booking.bookingdates;
    await expect(reservationPage.confirmedDates).toHaveText(`${checkin} - ${checkout}`);
    const { bookings } = await expectJson(
      await bookingApi.listByRoom(room.roomid, adminToken),
      200,
      bookingListSchema,
    );
    const saved = expectFound(bookings, (b) => b.lastname === booking.lastname, booking.lastname);
    expect(saved.bookingdates).toEqual(booking.bookingdates);
  });
});
