import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';

// Local runs read a .env file; in CI the variables come from the workflow.
// Variables already set in the shell win over the file (Node's behaviour),
// so a one-off `BASE_URL=... npx playwright test` still works locally.
const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const envSchema = z.object({
  BASE_URL: z.url({ protocol: /^https?$/ }),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  CI: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(process.env);

// Fail fast: a missing variable stops the run before any test starts, with
// a message naming the variable, instead of a confusing 401 in every test.
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration (see .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;

export const adminCredentials = {
  username: env.ADMIN_USERNAME,
  password: env.ADMIN_PASSWORD,
};
