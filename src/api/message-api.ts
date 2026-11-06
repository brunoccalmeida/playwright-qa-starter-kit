import type { APIRequestContext, APIResponse } from '@playwright/test';
import { z } from 'zod';
import { authCookie } from './schemas.ts';

/** The list only carries a summary; the full message would come from GET by id. */
export const messageSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  subject: z.string(),
  read: z.boolean(),
});
export const messageListSchema = z.object({ messages: z.array(messageSummarySchema) });
export const messageSchema = messageSummarySchema.extend({
  email: z.string(),
  phone: z.string(),
  description: z.string(),
});
/** Unlike the other resources, a 400 here is a bare array of messages. */
export const messageErrorsSchema = z.array(z.string());

export type NewMessage = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
};

/** Client for /api/message. Sending is public; reading should need the admin token (KI-2). */
export class MessageApi {
  constructor(private readonly request: APIRequestContext) {}

  create(message: NewMessage): Promise<APIResponse> {
    return this.request.post('/api/message', { data: message });
  }

  list(token?: string): Promise<APIResponse> {
    return this.request.get('/api/message', { headers: authCookie(token) });
  }

  get(id: number, token: string): Promise<APIResponse> {
    return this.request.get(`/api/message/${String(id)}`, { headers: authCookie(token) });
  }
}
