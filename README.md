# Playwright QA Starter Kit

A reusable Playwright + TypeScript starter kit for QA engagements: E2E and API tests, CI on GitHub Actions and a published HTML report.

The target application is the [Restful Booker Platform](https://automationintesting.online), a hotel booking demo built for testers.

> 🚧 Work in progress: the kit is being built mission by mission.

## Development

Requires Node.js (version in [.node-version](.node-version)).

```sh
npm ci            # install the exact locked dependencies
cp .env.example .env
npm run check     # type-check, lint, format check and dependency-ignore sentinel
npm run test:api  # API tests (no browser needed)
npx playwright install chromium firefox
npm run test:e2e  # browser tests (Chromium and Firefox)
```

Configuration comes from environment variables ([.env.example](.env.example)), validated at startup by [src/config/env.ts](src/config/env.ts): a missing or invalid variable stops the run with a message naming it. Variables set in the shell take precedence over `.env`.

## Tests

| Layer | Where                    | What it covers                                      |
| ----- | ------------------------ | --------------------------------------------------- |
| API   | [tests/api/](tests/api/) | Status codes, response contracts and business rules |
| E2E   | [tests/e2e/](tests/e2e/) | User journeys that need a browser                   |

- **Typed clients** per resource live in [src/api/](src/api/) and return the raw response.
- **`expectJson(response, status, schema)`** asserts the status, the JSON content type and the [zod](https://zod.dev) contract, and returns the typed body; failures show the URL and the raw body.
- **Fixtures** ([tests/fixtures.ts](tests/fixtures.ts)) give each test its own data, such as a fresh `adminToken` and a `room` nobody else books.
- **Data factories** ([src/data/factories.ts](src/data/factories.ts)) build unique payloads (name suffixes, random future dates): the target app is a shared environment, so tests never rely on existing data or on each other. Never assert that a new resource is empty: the environment periodically wipes data and can hand a new room the bookings of an old one.
- **Page objects** ([src/pages/](src/pages/)) expose user-facing locators and actions; tests make the assertions. A page's `expectLoaded()` waits for proof that the page is ready, not for an intermediate state such as a URL that changes before the content renders.
- **Admin session:** the `setup` project logs in through the UI once per run and saves the session to `playwright/.auth/admin.json` (ignored by Git: it grants access to the admin account). E2E tests run as a guest; an admin spec opts in with `test.use({ storageState: ADMIN_SESSION })` ([tests/e2e/fixtures.ts](tests/e2e/fixtures.ts)).
- **Browsers:** each journey runs on Chromium and on Firefox (projects `chromium` and `firefox`); both reuse the one admin session, a cookie valid in any browser.
- **Secrets stay out of the report:** Playwright titles input steps with the value (`Fill "<value>"`), so a password is typed with `fillSecret` ([src/pages/fill-secret.ts](src/pages/fill-secret.ts)), and ESLint rejects passing a password, secret or token to `fill` and the keyboard methods (on a locator or on `page`). An `expect` message is the step title even when the assertion passes, so ESLint also rejects messages built from data; `expectJson` and `expectStatus` put the response body in the error only on failure. A test that fails mid-login can still print it in the error details: treat the report of a client with real credentials as sensitive.
- **Known application bugs** are tests marked `test.fail()` that link to [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): they assert the correct behaviour, and start "failing" when the bug is fixed.
- **Workarounds for blocking bugs:** when an app bug blocks a whole journey, the browser test replaces only the broken call with `page.route` and keeps the rest real ([src/pages/known-issue-workarounds.ts](src/pages/known-issue-workarounds.ts)); the bug itself stays tracked by its `test.fail()` test. Example: the reservation page is blank because `GET /api/room/{id}` returns 500 (KI-1), so the booking journey serves that room from `GET /api/room`.

## Continuous integration

Every pull request runs the [CI workflow](.github/workflows/ci.yml). `main` is protected by a ruleset: changes land only through a squash-merged pull request whose `ci-passed` check is green on an up-to-date branch. `ci-passed` is the single required check; it succeeds only when every other job of the workflow succeeded, so new jobs are added to its `needs`, never to the ruleset.

**Test report:** the `api` and `e2e` jobs each write a blob report, and the `report` job merges them into one HTML report (also on pull requests, as the `github-pages` artifact). The `deploy` job publishes the report of `main` on [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/): after each merge and after the nightly run against the live app (06:23 UTC). Failing runs are published too: they are the report most worth reading. Traces stay off in CI because they would store the credentials; a failed test keeps a screenshot.

The `api` and `e2e` jobs read the admin credentials from the repository secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Set them both as **Actions** and as **Dependabot** secrets: workflows triggered by Dependabot can only read Dependabot secrets.

Dependabot opens weekly grouped updates for npm and GitHub Actions ([config](.github/dependabot.yml)). TypeScript majors are ignored while `typescript-eslint` rejects them as a peer dependency; [a sentinel](scripts/check-dependency-ignores.ts) in `npm run check` fails as soon as that is no longer true, so the ignore rule never outlives its reason.

The `audit` job runs `npm audit` and fails on any known vulnerability, so a pull request cannot add or keep one. It reads the same advisory database as Dependabot alerts, which watch `main` between pull requests. Fix a vulnerable transitive dependency by pinning the patched version in `overrides` in `package.json`.

## License

MIT, see [LICENSE](LICENSE).
