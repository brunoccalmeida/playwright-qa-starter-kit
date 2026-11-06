import { expectJson } from '../../src/api/expect-json.ts';
import { roomListSchema } from '../../src/api/room-api.ts';
import { expect, test } from './fixtures.ts';

// The home page renders only the first three rooms of GET /api/room
// (`rooms.slice(0, 3)` in the page's bundle). A room created by a test gets
// a later id and never shows there, so this test reads the rooms the page
// will show instead of creating one.
const FEATURED_ROOMS = 3;

test.describe('Home page', () => {
  test('shows the first rooms of the API with type, price and booking link', async ({
    roomApi,
    homePage,
  }) => {
    const { rooms } = await expectJson(await roomApi.list(), 200, roomListSchema);
    const featured = rooms.slice(0, FEATURED_ROOMS);

    await homePage.goto();

    await expect(homePage.roomCards).toHaveCount(featured.length);
    for (const [index, room] of featured.entries()) {
      const card = homePage.roomCards.nth(index);
      await expect(card.getByRole('heading', { name: room.type, exact: true })).toBeVisible();
      await expect(card).toContainText(`£${String(room.roomPrice)} per night`);
      await expect(card.getByRole('link', { name: 'Book now', exact: true })).toHaveAttribute(
        'href',
        new RegExp(`^/reservation/${String(room.roomid)}[?]`),
      );
    }
  });
});
