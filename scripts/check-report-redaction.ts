// Sentinel: a failed request must not put credentials in what the reporters
// publish. Playwright writes every request and response header to the call log
// of a failed request, and src/reporting/redacting-reporter.ts removes them by
// changing the objects it receives, which the reporter API does not document.
// If a Playwright upgrade breaks that, this check fails instead of the token
// reaching the public report in silence.
//
// It runs two failing requests against a local server, through the reporters
// of the real config in CI mode, and searches everything they wrote.
import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';
import { unzipSync } from 'fflate';
import RedactingReporter, { redactResult } from '../src/reporting/redacting-reporter.ts';

const token = randomBytes(16).toString('hex');

const server = createServer((request, response) => {
  if (request.url === '/drop-connection') {
    request.socket.destroy();
    return;
  }
  response.writeHead(500, { 'Set-Cookie': `session=${token}` }).end();
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address() as AddressInfo;

const workspace = mkdtempSync(join(tmpdir(), 'report-redaction-'));
const blobDir = join(workspace, 'blob');
const outputDir = join(workspace, 'output');

// Asynchronous on purpose: a synchronous spawn would block the server above
const run = await new Promise<{ exitCode: number; output: string }>((resolve) => {
  execFile(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)),
      'test',
      '--config',
      fileURLToPath(new URL('report-redaction/playwright.config.ts', import.meta.url)),
    ],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: {
        ...process.env,
        BASE_URL: `http://127.0.0.1:${String(port)}`,
        ADMIN_USERNAME: 'unused',
        ADMIN_PASSWORD: 'unused',
        CI: 'true',
        PLAYWRIGHT_BLOB_OUTPUT_DIR: blobDir,
        REDACTION_OUTPUT_DIR: outputDir,
        REDACTION_PROBE_TOKEN: token,
      },
    },
    (error, stdout, stderr) => {
      const exitCode = typeof error?.code === 'number' ? error.code : 0;
      resolve({ exitCode, output: stripVTControlCharacters(`${stdout}\n${stderr}`) });
    },
  );
});
server.close();

const filesIn = (directory: string): string[] =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

const blobs = filesIn(blobDir).filter((path) => path.endsWith('.zip'));
const leaks = [
  ...(run.output.includes(token) ? ['the terminal output'] : []),
  ...blobs.flatMap((blob) =>
    Object.entries(unzipSync(readFileSync(blob)))
      .filter(([, content]) => Buffer.from(content).includes(token))
      .map(([name]) => `${name} in the blob report`),
  ),
  ...filesIn(outputDir)
    .filter((path) => readFileSync(path).includes(token))
    .map((path) => `${path} in the test output`),
];

// Without these, a run that never produced a call log would look clean
const expectedLines = [
  /cookie: \[REDACTED\]/i,
  /authorization: \[REDACTED\]/i,
  /x-unlisted-header: \[REDACTED\]/i,
  /set-cookie: \[REDACTED\]/i,
  /user-agent: Playwright/i,
];

// Fail closed: an attachment that cannot be cleaned does not get published.
// A directory makes the read throw on every platform.
const unreadable = {
  errors: [],
  attachments: [{ name: 'unreadable', contentType: 'text/plain', path: workspace }],
};
redactResult(unreadable);

// Errors outside any test (global setup, for example) arrive through onError,
// which a failing test cannot exercise
const globalError = { message: `  - → GET http://host/\n    - cookie: token=${token}` };
new RedactingReporter().onError(globalError);

const problems = [
  ...(globalError.message.includes(token) ? ['An error outside the tests kept the token.'] : []),
  ...(run.exitCode === 1
    ? []
    : [`Expected the probe to fail with exit code 1, got ${String(run.exitCode)}.`]),
  ...(blobs.length === 0 ? ['The probe wrote no blob report: nothing to search.'] : []),
  ...leaks.map((where) => `The token reached ${where}.`),
  ...expectedLines
    .filter((line) => !line.test(run.output))
    .map((line) => `Missing from the call log: ${line.source}`),
  ...(unreadable.attachments.length === 0
    ? []
    : ['An attachment that could not be cleaned was kept.']),
];

rmSync(workspace, { recursive: true, force: true });

if (problems.length > 0) {
  console.error(`Report redaction failed:\n${problems.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Report redaction holds: no token in the output or in ${String(blobs.length)} blob.`);
}
