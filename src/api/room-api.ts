import type { APIRequestContext, APIResponse } from '@playwright/test';
import { z } from 'zod';
import { authCookie } from './schemas.ts';

// `type` stays a plain string in the response (tolerant reader): a new room
// type is not a breaking change for clients. The API itself only accepts
// Single, Double, Twin, Family or Suite.
export const roomSchema = z.object({
  roomid: z.number().int().positive(),
  roomName: z.string(),
  type: z.string(),
  accessible: z.boolean(),
  roomPrice: z.number(),
  features: z.array(z.string()),
  description: z.string(),
  image: z.string(),
});
export const roomListSchema = z.object({ rooms: z.array(roomSchema) });

export type Room = z.infer<typeof roomSchema>;
/** What POST /api/room takes. The response is only `{ success }`: no id. */
export type NewRoom = Omit<Room, 'roomid'>;
export type Stay = { checkin: string; checkout: string };

/** Client for /api/room. Creating a room needs the admin token. */
export class RoomApi {
  constructor(private readonly request: APIRequestContext) {}

  /** All rooms or, with a stay, only those free for those dates. */
  list(stay?: Stay): Promise<APIResponse> {
    return this.request.get('/api/room', stay === undefined ? {} : { params: stay });
  }

  create(room: NewRoom, token?: string): Promise<APIResponse> {
    return this.request.post('/api/room', { data: room, headers: authCookie(token) });
  }

  get(roomid: number): Promise<APIResponse> {
    return this.request.get(`/api/room/${String(roomid)}`);
  }
}
