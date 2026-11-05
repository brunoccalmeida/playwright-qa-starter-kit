// Sentinel for the TypeScript major-version ignore in .github/dependabot.yml.
//
// The ignore exists because typescript-eslint's peer dependency rejects the
// next TypeScript major, so every Dependabot PR for it would fail `npm ci`.
// A Dependabot ignore is silent: nothing says when its reason is gone. This
// check fails as soon as the installed typescript-eslint accepts the next
// major while the ignore is still there. It fires in the Dependabot PR that
// brings that typescript-eslint version. Fix it on main, not on Dependabot's
// branch (a push there stops Dependabot from rebasing it): delete the ignore
// in a PR of its own, then comment "@dependabot rebase" on the blocked PR.
// Dependabot then proposes the TypeScript major in a separate PR.
import { readFileSync } from 'node:fs';
import semver from 'semver';
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
const parseJsonFile = <T>(relativePath: string, schema: z.ZodType<T>): T =>
  parseFile(relativePath, schema, JSON.parse(readFile(relativePath)));

// Tolerant reader: only the fields this check needs
const dependabotSchema = z.object({
  updates: z.array(
    z.object({
      'package-ecosystem': z.string(),
      ignore: z
        .array(
          z.object({
            'dependency-name': z.string(),
            'update-types': z.array(z.string()).optional(),
          }),
        )
        .optional(),
    }),
  ),
});
const typescriptSchema = z.object({ version: z.string() });
const typescriptEslintSchema = z.object({
  version: z.string(),
  peerDependencies: z.object({ typescript: z.string() }),
});

const dependabotPath = '.github/dependabot.yml';
const dependabot = parseFile(dependabotPath, dependabotSchema, parse(readFile(dependabotPath)));
// Any ignore for typescript counts, whatever its shape (update-types,
// versions, or none at all): matching only the exact current entry would let a
// rewritten rule keep blocking the upgrade while silencing this alarm.
const typescriptIgnored = dependabot.updates
  .filter((update) => update['package-ecosystem'] === 'npm')
  .flatMap((update) => update.ignore ?? [])
  .some((rule) => rule['dependency-name'] === 'typescript');

if (!typescriptIgnored) {
  console.log(`No typescript ignore in ${dependabotPath}: nothing to check.`);
} else {
  const typescript = parseJsonFile('node_modules/typescript/package.json', typescriptSchema);
  const typescriptEslint = parseJsonFile(
    'node_modules/typescript-eslint/package.json',
    typescriptEslintSchema,
  );
  const nextMajor = semver.major(typescript.version) + 1;
  const peerRange = typescriptEslint.peerDependencies.typescript;

  if (semver.intersects(peerRange, `>=${String(nextMajor)}.0.0`)) {
    console.error(
      `typescript-eslint ${typescriptEslint.version} accepts TypeScript ${String(nextMajor)} ` +
        `(peer: "${peerRange}"). Remove the typescript ignore from ${dependabotPath} in a ` +
        `pull request of its own to main, then comment "@dependabot rebase" on this one.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `TypeScript major ignore still needed: typescript-eslint ${typescriptEslint.version} ` +
        `peer "${peerRange}" rejects TypeScript ${String(nextMajor)}.`,
    );
  }
}
