// Sentinel: in CI, a test that passes only on a retry must fail the run
// (docs/FLAKY_TESTS.md, section 3). Playwright reports such a test as "flaky"
// and, by default, still exits 0, so the merge gate would show green and the
// instability would pass unnoticed.
//
// It runs a test that fails on its first attempt and passes on the next, with
// the retry settings of the real config in CI mode, and expects exit code 1.
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const outputDir = mkdtempSync(join(tmpdir(), 'flaky-policy-'));

// CI mode for both the real config read below and the probe run. The real
// config validates the credentials on import; the probe uses none of them.
const probeEnv = {
  BASE_URL: 'http://127.0.0.1',
  ADMIN_USERNAME: 'unused',
  ADMIN_PASSWORD: 'unused',
  CI: 'true',
  FLAKY_POLICY_OUTPUT_DIR: outputDir,
};
Object.assign(process.env, probeEnv);
const { default: base } = await import('../playwright.config.ts');

const run = await new Promise<{ exitCode: number; output: string }>((resolve) => {
  execFile(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)),
      'test',
      '--config',
      fileURLToPath(new URL('flaky-policy/playwright.config.ts', import.meta.url)),
    ],
    { cwd: fileURLToPath(new URL('..', import.meta.url)), env: process.env },
    (error, stdout, stderr) => {
      const exitCode = typeof error?.code === 'number' ? error.code : 0;
      resolve({ exitCode, output: stripVTControlCharacters(`${stdout}\n${stderr}`) });
    },
  );
});

rmSync(outputDir, { recursive: true, force: true });

// The outcome the probe must reach under the real config: with retries it
// fails once and passes, so "flaky"; without, it fails outright. Anything else
// (a probe that fails every attempt, or never ran) would also exit 1 and look
// like the gate holding, without having produced a flaky result.
const expectedOutcome = (base.retries ?? 0) > 0 ? 'flaky' : 'failed';
const probeReached = new RegExp(`^\\s*1 ${expectedOutcome}$`, 'm').test(run.output);

const problem = !probeReached
  ? `The probe test did not end as "1 ${expectedOutcome}" (retries: ${String(base.retries ?? 0)}), ` +
    'so the policy was not checked.'
  : run.exitCode === 1
    ? undefined
    : `A test that passed only on a retry left the run with exit code ${String(run.exitCode)}. ` +
      'In CI it must fail the run: set failOnFlakyTests (docs/FLAKY_TESTS.md).';

if (problem === undefined) {
  console.log(`Flaky policy holds: a flaky test ended "${expectedOutcome}" and failed the run.`);
} else {
  console.error(`Flaky policy failed: ${problem}\n\n${run.output}`);
  process.exitCode = 1;
}
