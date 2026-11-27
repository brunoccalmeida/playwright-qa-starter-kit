import { test as base } from '@playwright/test';
import { AuthApi, tokenResponseSchema } from '../src/api/auth-api.ts';
import { BookingApi, type NewBooking } from '../src/api/booking-api.ts';
import { createBookingOrExplain } from '../src/api/create-booking.ts';
import { expectFound, expectJson } from '../src/api/expect-json.ts';
import { MessageApi } from '../src/api/message-api.ts';
import { RoomApi, roomListSchema, type Room } from '../src/api/room-api.ts';
import { successSchema } from '../src/api/schemas.ts';
import { adminCredentials } from '../src/config/env.ts';
import { newRoom } from '../src/data/factories.ts';

export { knownIssue } from './known-issues.ts';

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
   * the room has no bookings. It is deleted after the test. If the test
   * fails and the room is gone, the teardown adds an error naming the
   * environment as the likely cause.
   */
  room: Room;
  /**
   * Deletes the room with this unique name after the test. A failed delete
   * fails the test: a room left behind in the shared environment is a
   * defect of the suite, not noise to hide. In a test.fail() test the error
   * is reported but the test still counts as expected (measured on 1.65.1):
   * a broken delete still turns every regular test that uses `room` red.
   */
  deleteRoomAfterTest: (roomName: string) => void;
  /** Creates a booking the test needs; a refusal explains the state of the room. */
  createBooking: (booking: NewBooking) => ReturnType<typeof createBookingOrExplain>;
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
  deleteRoomAfterTest: async ({ roomApi, adminToken }, use, testInfo) => {
    const roomNames: string[] = [];
    await use((roomName) => {
      roomNames.push(roomName);
    });
    if (roomNames.length === 0) {
      return;
    }
    // Found again by name, not by the id seen during the test: the shared
    // environment can wipe rooms and reuse their ids, and only the test's
    // own room may be deleted
    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);
    for (const roomName of roomNames) {
      const room = rooms.find((r) => r.roomName === roomName);
      if (room === undefined) {
        // Not an error of the suite: the test failed before creating it, or
        // the environment wiped it. Reported, not thrown, so it does not
        // bury the test's own error.
        testInfo.annotations.push({
          type: 'cleanup',
          description: `Room "${roomName}" was not found after the test; nothing deleted.`,
        });
        continue;
      }
      const { success } = await expectJson(
        await roomApi.delete(room.roomid, adminToken),
        200,
        successSchema,
      );
      if (!success) {
        throw new Error(`Room "${roomName}" (id ${String(room.roomid)}) was not deleted`);
      }
    }
  },
  room: async ({ roomApi, adminToken, deleteRoomAfterTest }, use, testInfo) => {
    const room = newRoom();
    // Before the create: a create that saves the room and still answers an
    // error would otherwise leave it behind
    deleteRoomAfterTest(room.roomName);
    await expectJson(await roomApi.create(room, adminToken), 200, successSchema);
    // The create response carries no id: find the room by its unique name
    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);
    const created = expectFound(rooms, (r) => r.roomName === room.roomName, room.roomName);
    await use(created);
    // A test that deletes its own room (e.g. the KI-7 test) is not the
    // environment's doing; status, not expectedStatus: a test.fail() whose
    // room vanished gets the error too, in the report only
    if (
      testInfo.status === 'passed' ||
      testInfo.status === 'skipped' ||
      roomApi.hasDeleted(created.roomid)
    ) {
      return;
    }
    // A failed test whose room vanished: the shared environment is the
    // likely cause, and the test's own error ("element not found", 404)
    // does not say so (#65). This teardown runs before deleteRoomAfterTest's.
    const after = await expectJson(await roomApi.list(), 200, roomListSchema);
    if (!after.rooms.some((r) => r.roomName === room.roomName)) {
      const ids = after.rooms.map((r) => r.roomid).join(', ');
      throw new Error(
        `Environment: room "${room.roomName}" (id ${String(created.roomid)}), created for this test, ` +
          `was deleted during it by something outside the test: the shared environment's room reset, ` +
          `which restarts ids at 1, or another user. Room ids now: ${ids}. ` +
          `If the test's error involves this room, the cause is the environment, not the app. ` +
          `See "Test environment limit" in docs/KNOWN_ISSUES.md.`,
      );
    }
  },
  createBooking: async ({ bookingApi, adminToken }, use) => {
    await use((booking) => createBookingOrExplain(bookingApi, booking, adminToken));
  },
});

export { expect } from '@playwright/test';
