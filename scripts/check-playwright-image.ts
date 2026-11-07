// Sentinel: the Playwright container image of the workflows must match the
// @playwright/test locked in package-lock.json, and be pinned by digest.
//
// The image ships the browsers of one Playwright release; with any other
// version, "Playwright will be unable to locate browser executables"
// (playwright.dev/docs/docker). Dependabot bumps @playwright/test in
// package.json, never the image tag in a workflow, so without this check the
// mismatch would only surface when the e2e job fails. It fires in the
// Dependabot PR that bumps @playwright/test: update the tag and the digest
// in that same PR (see the e2e job in .github/workflows/ci.yml for how).
//
// The tag is what this check and people read; the digest is what Docker
// pulls (a tag can be republished, a digest cannot). If only the tag is
// bumped, the old browsers are pulled and the e2e job fails loudly.
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

const readFile = (relativePath: string): string =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

// Fail fast with the file name and the offending field, not a bare ZodError
const parseFile = <T>(relativePath: string, schema: z.ZodType<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Unexpected shape of ${relativePath}:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};

// Tolerant reader: only the fields this check needs. `container` is either
// the image itself or an object with `image` (GitHub workflow syntax).
const workflowSchema = z.object({
  jobs: z.record(
    z.string(),
    z.object({
      container: z.union([z.string(), z.object({ image: z.string() })]).optional(),
    }),
  ),
});
// The lockfile, not node_modules: it is what `npm ci` installs in CI, and a
// stale local node_modules (a pull without `npm ci`) would judge wrongly.
const lockfileSchema = z.object({
  packages: z.object({
    'node_modules/@playwright/test': z.object({ version: z.string() }),
  }),
});

const workflowsDir = '.github/workflows';
const lockfilePath = 'package-lock.json';
const repository = 'mcr.microsoft.com/playwright';
// v<version>-<ubuntu codename>@sha256:<digest>, e.g. v1.64.1-noble@sha256:...
const reference = /^v(?<version>\d+\.\d+\.\d+)-[a-z]+@sha256:[0-9a-f]{64}$/;

const locked = parseFile(lockfilePath, lockfileSchema, JSON.parse(readFile(lockfilePath))).packages[
  'node_modules/@playwright/test'
].version;

const images = readdirSync(new URL(`../${workflowsDir}`, import.meta.url))
  .filter((name) => /\.ya?ml$/.test(name))
  .flatMap((name) => {
    const path = `${workflowsDir}/${name}`;
    const workflow = parseFile(path, workflowSchema, parse(readFile(path)));
    return Object.entries(workflow.jobs).flatMap(([job, { container }]) => {
      const image = typeof container === 'string' ? container : container?.image;
      // ':' (tag) or '@' (digest only): either way it is this repository,
      // and a reference without the tag fails the format check below
      const ofRepository = [':', '@'].some((separator) =>
        image?.startsWith(`${repository}${separator}`),
      );
      return image !== undefined && ofRepository ? [{ where: `${path} (${job})`, image }] : [];
    });
  });

const problems = images.flatMap(({ where, image }) => {
  const match = reference.exec(image.slice(`${repository}:`.length));
  if (match?.groups === undefined) {
    return [`${where}: "${image}" is not ${repository}:v<version>-<codename>@sha256:<digest>`];
  }
  const { version } = match.groups;
  return version === locked
    ? []
    : [`${where}: image v${String(version)}, @playwright/test ${locked} in ${lockfilePath}`];
});

// Fail closed: a renamed registry or a typo in the only image must not leave
// this check with nothing to compare and a green exit. Scope: `container:`
// of jobs; the workflows use no `services:` nor `docker://` steps (YAGNI).
if (images.length === 0) {
  problems.push(`No ${repository} image found in ${workflowsDir}: nothing to compare.`);
}

if (problems.length > 0) {
  console.error(
    `Playwright container image out of step with @playwright/test:\n${problems.join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Playwright image matches @playwright/test ${locked} (${lockfilePath}) in ${String(images.length)} job(s).`,
  );
}
