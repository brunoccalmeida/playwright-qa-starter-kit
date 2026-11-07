import type { APIResponse } from '@playwright/test';
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
  await expectStatus(response, status);
  const text = await response.text();
  const context = `${response.url()}\nBody: ${text}`;

  const contentType = response.headers()['content-type'] ?? '(none)';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected a JSON Content-Type, received "${contentType}": ${context}`);
  }

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
 *
 * Plain errors, not `expect(value, message)`: Playwright turns that message
 * into the step title of a PASSING assertion too, so every response body
 * (login tokens included) would land in the published HTML report. Here the
 * body is only read into the message when the check fails.
 */
export async function expectStatus(response: APIResponse, status: number): Promise<void> {
  if (response.status() !== status) {
    throw new Error(
      `Expected HTTP ${String(status)}, received ${String(response.status())}: ${response.url()}\nBody: ${await response.text()}`,
    );
  }
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
