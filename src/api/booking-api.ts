import type { APIRequestContext, APIResponse } from '@playwright/test';
import { z } from 'zod';
import type { Stay } from './room-api.ts';
import { authCookie } from './schemas.ts';

export const bookingSchema = z.object({
  bookingid: z.number().int().positive(),
  roomid: z.number().int().positive(),
  firstname: z.string(),
  lastname: z.string(),
  depositpaid: z.boolean(),
  bookingdates: z.object({ checkin: z.iso.date(), checkout: z.iso.date() }),
});
export const bookingListSchema = z.object({ bookings: z.array(bookingSchema) });

/**
 * What POST /ui-api/booking takes; email and phone are not echoed back. With
 * both, the app also sends the guest's message to the message service
 * (BookingService.createBooking in the app source).
 */
export type NewBooking = {
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  email?: string;
  phone?: string;
  bookingdates: Stay;
};

/** A booking with the contact details the reservation form requires. */
export type GuestBooking = NewBooking & { email: string; phone: string };

/** Client for /ui-api/booking. Creating is public; reading needs the admin token. */
export class BookingApi {
  constructor(private readonly request: APIRequestContext) {}

  create(booking: NewBooking): Promise<APIResponse> {
    return this.request.post('/ui-api/booking', { data: booking });
  }

  listByRoom(roomid: number, token?: string): Promise<APIResponse> {
    return this.request.get('/ui-api/booking', {
      params: { roomid },
      headers: authCookie(token),
    });
  }

  get(bookingid: number, token: string): Promise<APIResponse> {
    return this.request.get(`/ui-api/booking/${String(bookingid)}`, { headers: authCookie(token) });
  }
}
