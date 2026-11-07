// @ts-check
import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'blob-report/'] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A forgotten `await` is the #1 source of flaky Playwright tests: the
      // step races the next one and the failure surfaces somewhere else.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // The published HTML report is public, and Playwright puts values in
      // step titles: see the two groups below.
      'no-restricted-syntax': [
        'error',
        // Input steps are titled with the value (`Fill "<value>"`). The value
        // is the 1st argument on a locator, the 2nd on page/frame
        // (`page.fill(selector, value)`). Secrets go through fillSecret.
        ...[0, 1].flatMap((i) =>
          ['name', 'property.name'].map((key) => ({
            selector: `CallExpression[callee.property.name=/^(fill|type|pressSequentially|insertText)$/][arguments.${String(i)}.${key}=/password|secret|token/i]`,
            message: 'The step title would show this secret in the report: use fillSecret.',
          })),
        ),
        // An expect message becomes the step title even when the assertion
        // passes, so a message built from data (a response body, a token)
        // is published. Constant messages are fine; options objects
        // (expect.poll, expect(x, { message })) are not checked.
        ...['callee.name', 'callee.object.name'].map((callee) => ({
          selector: `CallExpression[${callee}='expect'][arguments.1][arguments.1.type!='Literal'][arguments.1.type!='ObjectExpression']`,
          message:
            'This message is the step title even on success: use a constant, or expectJson/expectStatus (body only on failure).',
        })),
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/no-focused-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      // expectJson and expectStatus (src/api/expect-json.ts) assert the response;
      // a page object's expectLoaded asserts the page reached its ready state
      'playwright/expect-expect': [
        'error',
        { assertFunctionNames: ['expectJson', 'expectStatus', 'expectLoaded'] },
      ],
    },
  },
);
