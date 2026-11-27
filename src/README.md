# Support code

What the tests use but is not a test: configuration ([`config/env.ts`](config/env.ts), the only file the pack ships), and later the project's page objects, API clients and test data. The pack ships no such abstraction on purpose: they depend on the application, so they are written when the first real tests need them, one folder per kind (for example `src/pages/`, `src/api/`, `src/data/`).
