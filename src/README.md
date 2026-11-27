# Support code

What the tests use but is not a test, one folder per kind:

- [`config/`](config/): the environment variables, validated at startup ([`env.ts`](config/env.ts)).
- [`api/`](api/): the API client helpers, such as `expectJson` (a failure carries the URL and the raw body) and `createBooking`.
- [`pages/`](pages/): the Page Objects of the E2E tests.
- [`data/`](data/): test data factories that make each test's data unique, because the target application is a shared environment.
- [`reporting/`](reporting/): the reporter that redacts secrets from the published HTML report.
