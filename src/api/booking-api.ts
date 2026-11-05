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

/** What POST /api/booking takes; email and phone are not echoed back. */
export type NewBooking = {
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  email: string;
  phone: string;
  bookingdates: Stay;
};

/** Client for /api/booking. Creating is public; reading needs the admin token. */
export class BookingApi {
  constructor(private readonly request: APIRequestContext) {}

  create(booking: NewBooking): Promise<APIResponse> {
    return this.request.post('/api/booking', { data: booking });
  }

  listByRoom(roomid: number, token?: string): Promise<APIResponse> {
    return this.request.get('/api/booking', {
      params: { roomid },
      headers: authCookie(token),
    });
  }

  get(bookingid: number, token: string): Promise<APIResponse> {
    return this.request.get(`/api/booking/${String(bookingid)}`, { headers: authCookie(token) });
  }
}
