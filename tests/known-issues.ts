import type { TestDetails } from '@playwright/test';

export const KNOWN_ISSUES =
  'https://github.com/brunoccalmeida/playwright-qa-starter-kit/blob/main/docs/KNOWN_ISSUES.md';

/**
 * The headings of docs/KNOWN_ISSUES.md, verbatim: the link anchors come from
 * them. scripts/check-known-issues.ts (in npm run check) keeps both in sync.
 */
export const knownIssueTitles = {
  'KI-2': 'guest messages listed without authentication',
  'KI-3': 'logout does not invalidate the token',
  'KI-4': 'check-out before check-in returns 409',
  'KI-5': 'form fields without associated labels',
  'KI-6': 'availability ignores partially overlapping bookings',
  'KI-7': 'unknown room id returns 500',
  'KI-8': 'a stored booking is refused with 409',
} as const;

export type KnownIssueId = keyof typeof knownIssueTitles;

/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
}

/**
 * Details for a test that proves a documented app bug; its body calls
 * test.fail() right before the bug's assertions (#78). In the HTML
 * report the expected failure shows a red error with only a bare "fail"
 * annotation, which a client reads as a broken test. This adds a plain
 * sentence saying why it fails, the link to the bug's entry, and the
 * `@known-issue` tag, so the report can be filtered to these tests.
 */
export function knownIssue(id: KnownIssueId): TestDetails {
  // join, not a template literal: while the map is empty (a project with no
  // known issues yet) the key type is `never`, which the lint rule rejects
  const heading = [id, knownIssueTitles[id]].join(': ');
  return {
    tag: '@known-issue',
    annotation: [
      {
        type: 'Known issue',
        description: `${heading}. This test asserts the correct behaviour, so it is expected to fail until the app is fixed. It expects the failure only from the assertions that prove the bug: when it fails as expected, the error below is the evidence of the bug; a failure before them, such as the login form or an Environment: error, is reported as a failed test.`,
      },
      { type: 'issue', description: `${KNOWN_ISSUES}#${anchor(heading)}` },
    ],
  };
}
