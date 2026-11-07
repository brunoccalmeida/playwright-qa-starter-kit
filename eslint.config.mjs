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
      // Playwright titles input steps with the value (`Fill "<value>"`), so
      // the published HTML report would show a password typed this way.
      // Secrets go through fillSecret (src/pages/fill-secret.ts).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name=/^(fill|type|pressSequentially|insertText)$/][arguments.0.name=/password|secret|token/i]',
          message: 'The step title would show this secret in the report: use fillSecret.',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(fill|type|pressSequentially|insertText)$/][arguments.0.property.name=/password|secret|token/i]',
          message: 'The step title would show this secret in the report: use fillSecret.',
        },
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
