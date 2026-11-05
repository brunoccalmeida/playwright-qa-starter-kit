import type { NewBooking } from '../api/booking-api.ts';
import type { NewMessage } from '../api/message-api.ts';
import type { NewRoom, Stay } from '../api/room-api.ts';

// The target app is shared: every builder returns unique data, so tests
// never collide with each other or with other people using the app.

const DAY_MS = 24 * 60 * 60 * 1000;

function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDay: string, days: number): string {
  return isoDate(new Date(Date.parse(isoDay) + days * DAY_MS));
}

/** A stay starting on a random day one to three years ahead. */
export function futureStay(nights = 2): Stay {
  const daysAhead = 365 + Math.floor(Math.random() * 730);
  const checkin = isoDate(new Date(Date.now() + daysAhead * DAY_MS));
  return { checkin, checkout: addDays(checkin, nights) };
}

/** A stay of the same length, starting `gapDays` after the given check-out (negative overlaps). */
export function stayAfter(stay: Stay, gapDays = 0): Stay {
  const nights = (Date.parse(stay.checkout) - Date.parse(stay.checkin)) / DAY_MS;
  const checkin = addDays(stay.checkout, gapDays);
  return { checkin, checkout: addDays(checkin, nights) };
}

export function newRoom(): NewRoom {
  return {
    roomName: `QA ${uniqueSuffix()}`,
    type: 'Double',
    accessible: true,
    roomPrice: 150,
    features: ['WiFi', 'TV'],
    description: 'Room created by the Playwright QA starter kit.',
    image: '/images/room2.jpg',
  };
}

export function newBooking(roomid: number, bookingdates: Stay): NewBooking {
  return {
    roomid,
    firstname: 'Ana',
    lastname: `QA-${uniqueSuffix()}`,
    depositpaid: false,
    email: 'ana.qa@example.com',
    phone: '01234567890',
    bookingdates,
  };
}

export function newMessage(): NewMessage {
  return {
    name: `Guest ${uniqueSuffix()}`,
    email: 'guest.qa@example.com',
    phone: '01234567890',
    subject: 'Question about a room',
    description: 'Is there parking available near the hotel? Thanks!',
  };
}
