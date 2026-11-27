# Tests

One folder per test type, each a Playwright project in [`playwright.config.ts`](../playwright.config.ts): `api/` for tests that use only the `request` fixture (no browser starts), `e2e/` for tests that drive a browser. Each starts with a `smoke.spec.ts` tagged `@smoke`, which only proves the system under test answers; `npm run smoke` runs the tagged tests alone. Replace each smoke with a real test once there is one, and keep the `@smoke` tag on the fastest test that proves the system is up.
