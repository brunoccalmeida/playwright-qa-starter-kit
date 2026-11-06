import { ADMIN_SESSION, expect, test } from './fixtures.ts';

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
});
