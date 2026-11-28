# Tests

One folder per test type, each a Playwright project in [`playwright.config.ts`](../playwright.config.ts): `api/` for tests that use only the `request` fixture (no browser starts), `e2e/` for tests that drive a browser (Chromium and Firefox). Coverage of business rules goes to `api/`; `e2e/` covers only what needs a browser.

Each folder has a `smoke.spec.ts` tagged `@smoke`, which only proves the target application answers; `npm run smoke` runs the tagged tests alone, the `smoke` contract. They come from [automation-template](https://github.com/brunoccalmeida/automation-template) and stay: a deleted one comes back on the next `copier update`.

[`fixtures.ts`](fixtures.ts) holds the shared fixtures (such as the admin token), and [`known-issues.ts`](known-issues.ts) maps each `KI-n` to its entry in [`docs/KNOWN_ISSUES.md`](../docs/KNOWN_ISSUES.md) for `test.fail()`.
