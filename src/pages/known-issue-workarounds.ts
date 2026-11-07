import type { Page } from '@playwright/test';
import { roomListSchema } from '../api/room-api.ts';

/**
 * Works around KI-1 (GET /api/room/{id} returns 500) for browser journeys:
 * answers that request with the room taken from GET /api/room, which
 * works. Only the broken call is replaced; every other request reaches the
 * real app. The defect stays tracked by the API test, which this route
 * does not affect (it runs on `request`, not on a page).
 */
export async function serveRoomFromList(page: Page): Promise<void> {
  await page.route(/\/api\/room\/\d+$/, async (route) => {
    const roomid = Number(new URL(route.request().url()).pathname.split('/').pop());
    const response = await route.fetch({
      url: new URL('/api/room', route.request().url()).href,
      // route.fetch reuses the browser's headers. Firefox accepts zstd, which
      // Playwright's fetch does not decompress (microsoft/playwright#37032):
      // json() would parse the compressed bytes. Ask for what it decodes.
      headers: { ...route.request().headers(), 'accept-encoding': 'gzip, deflate, br' },
    });
    const { rooms } = roomListSchema.parse(await response.json());
    const room = rooms.find((r) => r.roomid === roomid);
    if (room === undefined) {
      // Not in the list (e.g. the shared environment was just reset):
      // answer 404 instead of making up a room
      await route.fulfill({ status: 404, json: { error: `Room ${String(roomid)} not found` } });
      return;
    }
    await route.fulfill({ json: room });
  });
}
