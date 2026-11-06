import { test as base } from '@playwright/test';
import { AuthApi, tokenResponseSchema } from '../src/api/auth-api.ts';
import { BookingApi } from '../src/api/booking-api.ts';
import { expectFound, expectJson } from '../src/api/expect-json.ts';
import { MessageApi } from '../src/api/message-api.ts';
import { RoomApi, roomListSchema, type Room } from '../src/api/room-api.ts';
import { successSchema } from '../src/api/schemas.ts';
import { adminCredentials } from '../src/config/env.ts';
import { newRoom } from '../src/data/factories.ts';

export const KNOWN_ISSUES =
  'https://github.com/brunoccalmeida/playwright-qa-starter-kit/blob/main/docs/KNOWN_ISSUES.md';

type ApiFixtures = {
  authApi: AuthApi;
  roomApi: RoomApi;
  bookingApi: BookingApi;
  messageApi: MessageApi;
  /** A fresh admin token per test: logging out in one test cannot affect another. */
  adminToken: string;
  /**
   * A room of the test's own: no other test books it, so booking rules
   * (overlap, availability) do not depend on other tests. It may not be
   * empty, though: the shared environment periodically deletes rooms,
   * restarts their ids and keeps the bookings, so a new room can inherit
   * old ones. Tests use random dates (`futureStay`) and never assert that
   * the room has no bookings. The room is not deleted afterwards:
   * DELETE /api/room/{id} returned 500 in the spike (KI-1).
   */
  room: Room;
};

export const test = base.extend<ApiFixtures>({
  authApi: async ({ request }, use) => {
    await use(new AuthApi(request));
  },
  roomApi: async ({ request }, use) => {
    await use(new RoomApi(request));
  },
  bookingApi: async ({ request }, use) => {
    await use(new BookingApi(request));
  },
  messageApi: async ({ request }, use) => {
    await use(new MessageApi(request));
  },
  adminToken: async ({ authApi }, use) => {
    const { token } = await expectJson(
      await authApi.login(adminCredentials),
      200,
      tokenResponseSchema,
    );
    await use(token);
  },
  room: async ({ roomApi, adminToken }, use) => {
    const room = newRoom();
    await expectJson(await roomApi.create(room, adminToken), 200, successSchema);
    // The create response carries no id: find the room by its unique name
    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);
    await use(expectFound(rooms, (r) => r.roomName === room.roomName, room.roomName));
  },
});

export { expect } from '@playwright/test';
