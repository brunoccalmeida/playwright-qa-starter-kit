// Sentinel: the numbers in the "At a Glance" of README.md and README.pt-BR.md
// must match the suite and docs/KNOWN_ISSUES.md.
//
// The READMEs are written by hand, in two languages, and are what an evaluator
// reads first. A test or known issue added on its own makes them wrong, with no
// signal from types, lint or the suite: the rule "update by hand" failed twice
// in one week (#72).
//
// It runs without the network or an installed browser: `--list` only loads the
// test files, and the environment below points at an address nobody calls.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JSONReport, JSONReportSuite, JSONReportTest } from '@playwright/test/reporter';

interface Facts {
  apiTests: number;
  e2eTests: number;
  openDefects: number;
  resolvedDefects: number;
}

interface Readme {
  file: string;
  claims: { fact: keyof Facts; pattern: RegExp }[];
}

const READMES: Readme[] = [
  {
    file: 'README.md',
    claims: [
      { fact: 'apiTests', pattern: /^- \*\*Tests:\*\* (\d+) API · /m },
      { fact: 'e2eTests', pattern: /^- \*\*Tests:\*\* \d+ API · (\d+) E2E/m },
      { fact: 'openDefects', pattern: /^- \*\*Defects found and tracked:\*\* (\d+) open/m },
      {
        fact: 'resolvedDefects',
        pattern: /^- \*\*Defects found and tracked:\*\* .*; (\d+) more \[already fixed/m,
      },
    ],
  },
  {
    file: 'README.pt-BR.md',
    claims: [
      { fact: 'apiTests', pattern: /^- \*\*Testes:\*\* (\d+) de API · /m },
      { fact: 'e2eTests', pattern: /^- \*\*Testes:\*\* \d+ de API · (\d+) E2E/m },
      {
        fact: 'openDefects',
        pattern: /^- \*\*Defeitos encontrados e acompanhados:\*\* (\d+) abertos/m,
      },
      {
        fact: 'resolvedDefects',
        pattern: /^- \*\*Defeitos encontrados e acompanhados:\*\* .*; mais (\d+) \[já corrigido/m,
      },
    ],
  },
];

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string): string => readFileSync(join(root, file), 'utf8');

const testsOf = (suite: JSONReportSuite): JSONReportTest[] => [
  ...suite.specs.flatMap((spec) => spec.tests),
  ...(suite.suites ?? []).flatMap(testsOf),
];

// Tests per project, from the same config `npm test` runs
function countTestsByProject(): Map<string, number> {
  const dir = mkdtempSync(join(tmpdir(), 'readme-numbers-'));
  const output = join(dir, 'list.json');
  try {
    execFileSync(
      process.execPath,
      [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--list', '--reporter=json'],
      {
        cwd: root,
        // stdout: --list prints every test there; errors come through stderr
        stdio: ['ignore', 'ignore', 'inherit'],
        env: {
          ...process.env,
          // The config validates these on import; listing calls none of them.
          // Set here, they win over a local .env (Node's loadEnvFile does not override).
          BASE_URL: 'http://127.0.0.1',
          ADMIN_USERNAME: 'unused',
          ADMIN_PASSWORD: 'unused',
          PLAYWRIGHT_JSON_OUTPUT_FILE: output,
        },
      },
    );
    const report = JSON.parse(readFileSync(output, 'utf8')) as JSONReport;
    if (report.errors.length > 0) {
      throw new Error(report.errors.map((error) => error.message).join('\n'));
    }
    const counts = new Map<string, number>();
    for (const test of report.suites.flatMap(testsOf)) {
      counts.set(test.projectName, (counts.get(test.projectName) ?? 0) + 1);
    }
    return counts;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function countProject(counts: Map<string, number>, project: string): number {
  const count = counts.get(project);
  if (count === undefined) {
    throw new Error(
      `playwright test --list has no "${project}" project: ${JSON.stringify([...counts])}`,
    );
  }
  return count;
}

// Open issues are `## KI-n` headings; resolved ones are `### KI-n` under "Resolved issues"
function countDefects(): { open: number; resolved: number } {
  const doc = 'docs/KNOWN_ISSUES.md';
  const heading = '## Resolved issues';
  const [before = '', after] = read(doc).split(new RegExp(`^${heading}$`, 'm'));
  if (after === undefined) throw new Error(`${doc} lacks "${heading}"`);
  return {
    open: [...before.matchAll(/^## KI-\d+:/gm)].length,
    resolved: [...after.matchAll(/^### KI-\d+:/gm)].length,
  };
}

const counts = countTestsByProject();
const defects = countDefects();
const facts: Facts = {
  apiTests: countProject(counts, 'api'),
  e2eTests: countProject(counts, 'chromium'),
  openDefects: defects.open,
  resolvedDefects: defects.resolved,
};

// The READMEs say each E2E test runs on both browsers: one number for both
const firefox = countProject(counts, 'firefox');
if (firefox !== facts.e2eTests) {
  console.error(
    `The READMEs give one E2E count for both browsers, but chromium has ${String(facts.e2eTests)} tests and firefox ${String(firefox)}`,
  );
  process.exitCode = 1;
}

for (const readme of READMES) {
  const markdown = read(readme.file);
  const errors = readme.claims.flatMap(({ fact, pattern }) => {
    const found = pattern.exec(markdown)?.[1];
    if (found === undefined) return [`no longer finds the ${fact} claim: ${String(pattern)}`];
    return Number(found) === facts[fact]
      ? []
      : [`says ${found} ${fact}, the repository has ${String(facts[fact])}`];
  });
  if (errors.length > 0) {
    console.error(`${readme.file} disagrees with the repository:\n- ${errors.join('\n- ')}`);
    process.exitCode = 1;
  }
}

if (process.exitCode === 1) {
  console.error('Update the "At a Glance" of both READMEs (counts: npx playwright test --list).');
}
