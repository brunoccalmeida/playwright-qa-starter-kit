import { z } from 'zod';

// Contracts shared across resources. The app reports errors in three shapes;
// each endpoint's test states which one it gets:
//   { error: "..." }      auth, 401 on bookings, 409 on bookings
//   { errors: ["..."] }   rooms, 400 on bookings
//   ["..."]               messages (see message-api.ts)
export const errorSchema = z.object({ error: z.string() });
export const errorListSchema = z.object({ errors: z.array(z.string()) });
export const successSchema = z.object({ success: z.boolean() });

/** The `token` cookie that protected endpoints read (not an Authorization header). */
export function authCookie(token: string | undefined): Record<string, string> {
  return token === undefined ? {} : { Cookie: `token=${token}` };
}
