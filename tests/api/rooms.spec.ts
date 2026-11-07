import { bookingSchema } from '../../src/api/booking-api.ts';
import { expectFound, expectJson } from '../../src/api/expect-json.ts';
import { roomListSchema, roomSchema } from '../../src/api/room-api.ts';
import { errorListSchema, successSchema } from '../../src/api/schemas.ts';
import { futureStay, newBooking, newRoom, stayAfter } from '../../src/data/factories.ts';
import { expect, knownIssue, test } from '../fixtures.ts';

test.describe('GET /api/room', () => {
  test('lists rooms matching the contract', async ({ roomApi, room }) => {
    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);

    // Its own room, not the seed: the shared environment periodically wipes rooms
    expect(rooms).toContainEqual(room);
  });

  test('leaves out a room already booked for the requested dates', async ({
    roomApi,
    bookingApi,
    room,
  }) => {
    const stay = futureStay();
    await expectJson(await bookingApi.create(newBooking(room.roomid, stay)), 201, bookingSchema);

    const booked = await expectJson(await roomApi.list(stay), 200, roomListSchema);
    const free = await expectJson(await roomApi.list(stayAfter(stay, 7)), 200, roomListSchema);

    expect(booked.rooms.map((r) => r.roomid)).not.toContain(room.roomid);
    expect(free.rooms.map((r) => r.roomid)).toContain(room.roomid);
  });

  test.fail(
    'leaves out a room booked for part of the requested dates',
    knownIssue('KI-6'),
    async ({ roomApi, bookingApi, room }) => {
      const stay = futureStay(3);
      await expectJson(await bookingApi.create(newBooking(room.roomid, stay)), 201, bookingSchema);

      // Starts on the last night of the booking: POST /api/booking rejects it with 409
      const overlapping = stayAfter(stay, -1);
      const { rooms } = await expectJson(await roomApi.list(overlapping), 200, roomListSchema);

      expect(rooms.map((r) => r.roomid)).not.toContain(room.roomid);
    },
  );
});

test.describe('POST /api/room', () => {
  test('creates a room that shows up in the list', async ({ roomApi, adminToken }) => {
    const room = newRoom();

    const body = await expectJson(await roomApi.create(room, adminToken), 200, successSchema);
    expect(body.success).toBe(true);

    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);
    const created = expectFound(rooms, (r) => r.roomName === room.roomName, room.roomName);
    expect(created).toMatchObject(room);
  });

  test('requires authentication', async ({ roomApi }) => {
    const response = await roomApi.create(newRoom());

    const body = await expectJson(response, 401, errorListSchema);
    expect(body.errors).toEqual(['Authentication required']);
  });

  test('rejects an unknown room type with 400', async ({ roomApi, adminToken }) => {
    const response = await roomApi.create({ ...newRoom(), type: 'Castle' }, adminToken);

    const body = await expectJson(response, 400, errorListSchema);
    expect(body.errors).toContain(
      'Type can only contain the room options Single, Double, Twin, Family or Suite',
    );
  });
});

test.describe('GET /api/room/{id}', () => {
  test.fail('returns the room', knownIssue('KI-1'), async ({ roomApi, room }) => {
    const response = await roomApi.get(room.roomid);

    const body = await expectJson(response, 200, roomSchema);
    expect(body).toEqual(room);
  });
});
