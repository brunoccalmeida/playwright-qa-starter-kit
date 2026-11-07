import { expectFound, expectJson } from '../../src/api/expect-json.ts';
import { roomListSchema } from '../../src/api/room-api.ts';
import { newRoom } from '../../src/data/factories.ts';
import { ADMIN_SESSION, expect, KNOWN_ISSUES, test } from './fixtures.ts';

test.use({ storageState: ADMIN_SESSION });

test.describe('Admin rooms', () => {
  test('the saved session opens the room list without logging in', async ({
    room,
    adminRoomsPage,
  }) => {
    await adminRoomsPage.goto();

    await adminRoomsPage.expectLoaded();
    await expect(adminRoomsPage.room(room.roomName)).toBeVisible();
  });

  // The room is not deleted afterwards: DELETE /api/room/{id} returns 500
  // (KI-1). Its unique name keeps it from clashing with other data.
  test('the admin creates a room and it is listed and saved', async ({
    adminRoomsPage,
    roomApi,
  }) => {
    const room = newRoom();

    await adminRoomsPage.goto();
    await adminRoomsPage.createRoom(room);

    const listing = adminRoomsPage.listing(room.roomName);
    // Whole cells: a substring of the row could also match the random name
    await expect(listing.getByText(room.type, { exact: true })).toBeVisible();
    await expect(listing.getByText(String(room.roomPrice), { exact: true })).toBeVisible();
    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);
    const saved = expectFound(rooms, (r) => r.roomName === room.roomName, room.roomName);
    expect(saved).toMatchObject({
      type: room.type,
      accessible: room.accessible,
      roomPrice: room.roomPrice,
      features: room.features,
    });
  });

  test.fail(
    'the create-room fields are found by their labels',
    {
      annotation: {
        type: 'issue',
        description: `${KNOWN_ISSUES}#ki-5-form-fields-without-associated-labels`,
      },
    },
    async ({ adminRoomsPage, page }) => {
      await adminRoomsPage.goto();

      // Assumes the fix labels each field with its column header. A fix
      // with other texts, or of only some fields, keeps this test failing:
      // check the form whenever KI-5 is reported fixed.
      await expect(page.getByRole('textbox', { name: 'Room #', exact: true })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Type', exact: true })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Accessible', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Price', exact: true })).toBeVisible();
    },
  );
});
