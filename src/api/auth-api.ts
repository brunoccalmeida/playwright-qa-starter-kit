import type { APIRequestContext, APIResponse } from '@playwright/test';
import { z } from 'zod';

// Response contracts. z.object ignores extra fields on purpose (tolerant
// reader): the app adding a field is not a breaking change for its clients.
export const tokenResponseSchema = z.object({ token: z.string().min(1) });
export const validateResponseSchema = z.object({ valid: z.boolean() });
export const logoutResponseSchema = z.object({ success: z.boolean() });
export const errorSchema = z.object({ error: z.string() });

export type Credentials = { username: string; password: string };

/**
 * Client for /api/auth. Methods return the raw response so each test decides
 * what to assert (status, contract, error message); `expectJson` does both.
 *
 * Note: validate and logout read the token from the JSON body. The other
 * endpoints read it from the `token` cookie.
 */
export class AuthApi {
  constructor(private readonly request: APIRequestContext) {}

  login(credentials: Credentials): Promise<APIResponse> {
    return this.request.post('/api/auth/login', { data: credentials });
  }

  validate(token: string): Promise<APIResponse> {
    return this.request.post('/api/auth/validate', { data: { token } });
  }

  logout(token: string): Promise<APIResponse> {
    return this.request.post('/api/auth/logout', { data: { token } });
  }
}
