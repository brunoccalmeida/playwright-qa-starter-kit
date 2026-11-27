import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import type {
  Reporter,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';

// Fail closed: a header not listed here is masked, so a credential under a
// name nobody thought of (X-Api-Key, X-Client-Token...) is covered by default.
const HARMLESS_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'connection',
  'content-length',
  'content-type',
  'date',
  'user-agent',
]);

const MESSAGE_LINE = /^\s*- [→←] /;
const HEADER_LINE = /^(?<indent>\s*- )(?<name>[^\s:]+):/;

/**
 * Masks the header values in the call log of a failed request. Lines outside
 * a request or response block are left alone: the call log of a browser action
 * is what explains why a locator failed.
 */
function redactCallLog(text: string): string {
  let inMessage = false;
  return text
    .split('\n')
    .map((line) => {
      const plain = stripVTControlCharacters(line);
      if (MESSAGE_LINE.test(plain)) {
        inMessage = true;
        return line;
      }
      const groups = inMessage ? HEADER_LINE.exec(plain)?.groups : undefined;
      if (groups === undefined) {
        inMessage = false;
        return line;
      }
      const { indent = '', name = '' } = groups;
      return HARMLESS_HEADERS.has(name.toLowerCase()) ? line : `${indent}${name}: [REDACTED]`;
    })
    .join('\n');
}

function redactError(error: TestError): void {
  for (const field of ['message', 'stack'] as const) {
    const text = error[field];
    if (text !== undefined) {
      error[field] = redactCallLog(text);
    }
  }
  if (error.value !== undefined) {
    // A thrown non-Error arrives as util.inspect output, with its line breaks
    // escaped, so it has no lines to read: the whole call log goes.
    error.value = error.value.replace(/Call log:.*/s, 'Call log: [REDACTED]');
  }
  if (error.cause !== undefined) {
    redactError(error.cause);
  }
}

type Attachment = TestResult['attachments'][number];

function cleanAttachment({ path, contentType }: Attachment): void {
  if (path === undefined || !/^text\/|^application\/json/.test(contentType)) {
    return;
  }
  const original = readFileSync(path, 'utf8');
  const redacted = redactCallLog(original);
  if (redacted !== original) {
    writeFileSync(path, redacted);
  }
}

function removeFile(path: string | undefined): void {
  if (path === undefined) {
    return;
  }
  try {
    rmSync(path, { force: true });
  } catch {
    // A directory, which the blob does not zip, or a file that cannot be removed
  }
}

/** Removes header values from the errors and the text attachments of a result. */
export function redactResult(result: Pick<TestResult, 'errors' | 'attachments'>): void {
  result.errors.forEach(redactError);
  for (const attachment of result.attachments) {
    try {
      cleanAttachment(attachment);
    } catch {
      // Fail closed: what could not be cleaned is not published. The blob
      // reporter has already recorded the path and zips whatever file is there
      // at the end of the run, so the file goes, not the list entry (removing
      // the entry would also shift the attachment indexes the blob keeps).
      removeFile(attachment.path);
    }
  }
}

/**
 * Keeps credentials out of the terminal, the CI log and the published report:
 * Playwright writes every request and response header to the call log of a
 * failed request, and records it in the step before a test can catch the error.
 *
 * It changes the objects that the other reporters receive, which the reporter
 * API does not document; scripts/check-report-redaction.ts fails if that stops
 * working. Revisit when Playwright ships its reporter `secrets` option (#21).
 *
 * Not covered: the tests' stdout and stderr (so `DEBUG=pw:api` in CI would
 * publish the cookie), values in a URL or a response body, and attachments
 * with a `body` instead of a `path` or with a type other than `text/*` and
 * `application/json`. None of the kit's attachments falls there today.
 */
export default class RedactingReporter implements Reporter {
  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.error !== undefined) {
      redactError(step.error);
    }
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    redactResult(result);
  }

  onError(error: TestError): void {
    redactError(error);
  }

  printsToStdio(): boolean {
    return false;
  }
}
