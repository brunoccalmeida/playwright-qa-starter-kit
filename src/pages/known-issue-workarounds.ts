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
    const response = await route.fetch({ url: new URL('/api/room', route.request().url()).href });
    const { rooms } = roomListSchema.parse(await response.json());
    const room = rooms.find((r) => r.roomid === roomid);
    if (room === undefined) {
      // Same answer the app would give for an unknown id: let the page show it
      await route.fulfill({ status: 404, json: { error: `Room ${String(roomid)} not found` } });
      return;
    }
    await route.fulfill({ json: room });
  });
}
