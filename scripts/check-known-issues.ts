// Sentinel: the known-issue map in tests/known-issues.ts must match the
// headings of docs/KNOWN_ISSUES.md, the client deliverable.
//
// Each test.fail() links to its entry through an anchor derived from the
// title in the map. If a heading is reworded, or an issue is added on one
// side only, the report's link silently opens the top of the page:
// GitHub does not fail on a missing anchor, and no type or lint sees it.
import { readFileSync } from 'node:fs';
import { knownIssueTitles } from '../tests/known-issues.ts';

const doc = 'docs/KNOWN_ISSUES.md';
const markdown = readFileSync(new URL(`../${doc}`, import.meta.url), 'utf8');
const inDoc = [...markdown.matchAll(/^## (KI-\d+): (.+)$/gm)].map(
  ([, id, title]) => `${id ?? ''}: ${title ?? ''}`,
);
// <string>: an empty map (a project with no known issues yet) would infer `unknown`
const inMap = Object.entries<string>(knownIssueTitles).map(([id, title]) => `${id}: ${title}`);

const missingInMap = inDoc.filter((heading) => !inMap.includes(heading));
const missingInDoc = inMap.filter((heading) => !inDoc.includes(heading));

if (missingInMap.length > 0 || missingInDoc.length > 0) {
  console.error(
    `tests/known-issues.ts and ${doc} disagree (titles must be identical: they build the links).\n` +
      `Only in ${doc}: ${JSON.stringify(missingInMap)}\n` +
      `Only in tests/known-issues.ts: ${JSON.stringify(missingInDoc)}`,
  );
  process.exitCode = 1;
}
