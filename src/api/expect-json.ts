import { expect, type APIResponse } from '@playwright/test';
import { z } from 'zod';

/**
 * Asserts the status, that the body is JSON, and that it matches the
 * contract; returns the body typed by the schema.
 *
 * Every failure message carries the URL and the raw body: a bare
 * "expected 200, received 500" says nothing about why.
 */
export async function expectJson<Schema extends z.ZodType>(
  response: APIResponse,
  status: number,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const text = await response.text();
  const context = `${response.url()}\nBody: ${text}`;

  expect(response.status(), `HTTP status of ${context}`).toBe(status);
  expect(response.headers()['content-type'], `Content-Type of ${context}`).toContain(
    'application/json',
  );

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Body is not valid JSON: ${context}`);
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Body does not match the contract:\n${z.prettifyError(result.error)}\n${context}`,
    );
  }
  return result.data;
}

/**
 * Asserts only the status, with the URL and raw body in the failure message.
 * For a test.fail() whose fixed response is unknown: expectJson would also
 * demand a JSON body, so a fix returning, say, an empty 401 would still fail
 * the test and the fix would never be reported.
 */
export async function expectStatus(response: APIResponse, status: number): Promise<void> {
  const text = await response.text();
  expect(response.status(), `HTTP status of ${response.url()}\nBody: ${text}`).toBe(status);
}

/**
 * Returns the item matching the predicate, failing with what was looked for
 * otherwise. The API creates some resources without returning their id, so
 * tests find them by a unique field in the list.
 */
export function expectFound<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  description: string,
): T {
  const found = items.find(predicate);
  if (found === undefined) {
    throw new Error(`Not found in a list of ${String(items.length)} items: ${description}`);
  }
  return found;
}
