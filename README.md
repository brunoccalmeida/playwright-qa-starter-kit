# Playwright QA Starter Kit

[![CI](https://github.com/brunoccalmeida/playwright-qa-starter-kit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/brunoccalmeida/playwright-qa-starter-kit/actions/workflows/ci.yml)
[![Test report](https://img.shields.io/badge/test%20report-GitHub%20Pages-blue)](https://brunoccalmeida.github.io/playwright-qa-starter-kit/)
[![Playwright version](https://img.shields.io/github/package-json/dependency-version/brunoccalmeida/playwright-qa-starter-kit/dev/%40playwright%2Ftest)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**English** | **[Português (Brasil)](README.pt-BR.md)**

A reusable Playwright + TypeScript starter kit for QA engagements: E2E and API tests, CI on GitHub Actions and a published HTML report.

The target application is the [Restful Booker Platform](https://automationintesting.online), a hotel booking demo built for testers.

## At a Glance

<!-- The numbers below are checked against the suite and docs/KNOWN_ISSUES.md by scripts/check-readme-numbers.ts (`npm run check`), here and in README.pt-BR.md. -->

- **Tests:** 36 API · 10 E2E, each E2E test on Chromium and on Firefox, against a live environment shared with other testers
- **Defects found and tracked:** 8 open in the application under test, [documented](docs/KNOWN_ISSUES.md) and each asserted by a test that signals when the defect is fixed; 1 more [already fixed by the application and detected by the suite](docs/KNOWN_ISSUES.md#resolved-issues)
- **Quality gates:** `main` only accepts a pull request that passes strict type-checking, lint, the tests, a dependency audit (OSV-Scanner), secret scanning (gitleaks) and a workflow audit (zizmor)
- **Live report:** HTML, republished on every merge and every night: 📊 **[View the latest test report](https://brunoccalmeida.github.io/playwright-qa-starter-kit/)**
- **Reusable:** a [step-by-step guide](docs/ADAPTING.md) takes the kit to a new client application
- **AI-assisted, same gates:** built with an AI coding agent that gets no shortcut past CI, under [written project rules](CLAUDE.md): every test was seen failing before it counted

## Reuse it for your application

[docs/ADAPTING.md](docs/ADAPTING.md) covers the decisions to make first (private repository, test environment, who can read the report), what to replace and what carries over, the GitHub settings that do not travel with the code, and how to prove the result works.

## Development

Requires Node.js (version in [.node-version](.node-version)).

```sh
npm ci            # install the exact locked dependencies
cp .env.example .env
npm run check     # type-check, lint, format check and the sentinels in scripts/
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
- **Fixtures** ([tests/fixtures.ts](tests/fixtures.ts)) give each test its own data, such as a fresh `adminToken` and a `room` nobody else books. Rooms are deleted after the test: a test that creates one itself registers it with `deleteRoomAfterTest(roomName)` before the create and calls the function it returns once the app confirmed the save (a saved room missing after a failed test then gets an `Environment:` error naming the possible causes), and a failed delete fails the test, except when the shared environment caused it (the room was already gone, or the auth reset invalidated the token; then the room is deleted with a new login): that becomes a `cleanup` annotation in the report. Bookings and messages are not deleted yet.
- **Data factories** ([src/data/factories.ts](src/data/factories.ts)) build unique payloads (name suffixes, random future dates): the target app is a shared environment, so tests never rely on existing data or on each other. Never assert that a new resource is empty: the environment periodically wipes data and can hand a new room the bookings of an old one.
- **Page objects** ([src/pages/](src/pages/)) expose user-facing locators and actions; tests make the assertions. A page's `goto()` returns only once the page is ready to use, not in an intermediate state: a URL that changes before the content renders, or a form that the room list (loading above it) is about to push down. `expectLoaded()` proves the session after a UI login.
- **Admin session:** E2E tests run as a guest; an admin spec imports `adminTest` ([tests/e2e/fixtures.ts](tests/e2e/fixtures.ts)), and each of its tests logs in through the API and opens the browser with that session's cookie. Not one session saved per run: the shared environment's auth reset deletes every token, and a saved session would send every later admin test to the login page ([#70](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/70)).
- **Browsers:** each journey runs on Chromium and on Firefox (projects `chromium` and `firefox`); each admin test logs in on its own, in either browser.
- **Secrets stay out of the report:** Playwright titles input steps with the value (`Fill "<value>"`), so a password is typed with `fillSecret` ([src/pages/fill-secret.ts](src/pages/fill-secret.ts)), and ESLint rejects passing a password, secret or token to `fill` and the keyboard methods (on a locator or on `page`). An `expect` message is the step title even when the assertion passes, so ESLint also rejects messages built from data; `expectJson` and `expectStatus` put the response body in the error only on failure. A failed request's call log lists every request and response header, so a [redacting reporter](src/reporting/redacting-reporter.ts) masks all but a short list of harmless ones before anything is written, and [a sentinel](scripts/check-report-redaction.ts) fails `npm run check` if that stops working. A test that fails mid-login can still print the password in the error details: treat the report of a client with real credentials as sensitive.
- **Known application bugs** are tests declared `test(title, knownIssue('KI-n'), body)` that link to [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): they assert the correct behaviour, and start "failing" when the bug is fixed. The body calls `test.fail()` right before the assertions that prove the bug, so a failure while arranging the test (a session or room wiped by the shared environment) fails the run instead of passing as the bug. In the report they carry the `@known-issue` tag and a sentence explaining the expected failure ([tests/known-issues.ts](tests/known-issues.ts)).
- **Workarounds for blocking bugs:** when an app bug blocks a whole journey, the browser test replaces only the broken call with `page.route` and keeps the rest real; the bug itself stays tracked by its `test.fail()` test. Example: while `GET /api/room/{id}` returned 500 (KI-1), the reservation page was blank and the booking journey served that room from the room list. When the app fixed it, the `test.fail()` tests flagged the fix and the workaround was removed ([resolved issues](docs/KNOWN_ISSUES.md#resolved-issues)).

## Continuous integration

Every pull request runs the [CI workflow](.github/workflows/ci.yml). `main` is protected by a ruleset: changes land only through a squash-merged pull request whose `ci-passed` check is green on an up-to-date branch. `ci-passed` is the single required check; it succeeds only when every other job of the workflow succeeded, so new jobs are added to its `needs`, never to the ruleset.

**Test report:** the `api` and `e2e` jobs each write a blob report, and the `report` job merges them into one HTML report (also on pull requests, as the `github-pages` artifact). The `deploy` job publishes the report of `main` on [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/): after each merge and after the nightly run against the live app (06:23 UTC). Failing runs are published too: they are the report most worth reading. Traces stay off in CI because they would store the credentials; a failed test keeps a screenshot.

**Flaky tests:** CI retries a failed test twice, only to prove on the same commit that it is flaky: a test that passes only on a retry still fails the run (`failOnFlakyTests`, held by [a sentinel](scripts/check-flaky-policy.ts) in `npm run check`). Each flake gets an issue and its own fix; [docs/FLAKY_TESTS.md](docs/FLAKY_TESTS.md) is the policy, from recording to quarantine, and [docs/FLAKY_TESTS_PLAYWRIGHT.md](docs/FLAKY_TESTS_PLAYWRIGHT.md) how this kit applies it.

The `api` and `e2e` jobs read the admin credentials from the repository secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Set them both as **Actions** and as **Dependabot** secrets: workflows triggered by Dependabot can only read Dependabot secrets.

Dependabot opens weekly grouped updates for npm and GitHub Actions ([config](.github/dependabot.yml)). TypeScript majors are ignored while `typescript-eslint` rejects them as a peer dependency; [a sentinel](scripts/check-dependency-ignores.ts) in `npm run check` fails as soon as that is no longer true, so the ignore rule never outlives its reason.

The `e2e` job runs in the official Playwright container image, which ships the browsers and their system libraries, so no run depends on an `apt` mirror. The image tag must match `@playwright/test`, and Dependabot does not bump it: [another sentinel](scripts/check-playwright-image.ts) fails `npm run check` in the Dependabot pull request that bumps Playwright, until the tag and digest in the workflow are updated in that same pull request (the `e2e` job's comment shows how to get the digest).

The `audit` job runs [OSV-Scanner](https://google.github.io/osv-scanner/) on `package-lock.json` and fails on any known vulnerability, so a pull request cannot add or keep one. The OSV database includes the advisories behind Dependabot alerts, which watch `main` between pull requests. Fix a vulnerable transitive dependency by pinning the patched version in `overrides` in `package.json`. Only when no fix is published and the code is not exploitable here, add a time-boxed exception to [`osv-scanner.toml`](osv-scanner.toml) (a reason, at most 30 days, a tracking issue); when it expires the job fails again.

The `core-checks` job guards the repository itself. It calls [`core-checks.yml`](.github/workflows/core-checks.yml), a reusable workflow that comes from [automation-template](https://github.com/brunoccalmeida/automation-template) (`.copier-answers.yml` records the version) and is updated with `copier update`, not edited here:

- `text-encoding` fails on any tracked text file that is not UTF-8, such as a UTF-16 file written by Windows PowerShell 5.1, which Git stores as binary and the tool that reads it silently ignores.
- `secret-scan` runs [gitleaks](https://github.com/gitleaks/gitleaks) over the whole history of the tested commit (on a pull request, what `main` would contain), so a secret committed and deleted later in the same pull request still fails it. Other branches are left to GitHub secret scanning, which watches every branch for known provider tokens; enable it (with push protection) in a copy of the kit. Logs are redacted. A real secret is rotated first, then removed; a false positive is allowed with a `gitleaks:allow` comment on the line (a fingerprint in `.gitleaksignore` embeds the commit SHA, so use it only for a commit already on `main`).
- `workflow-audit` runs [zizmor](https://docs.zizmor.sh) on the workflows and fails on any finding: template injection, excessive permissions, persisted credentials, and any action not pinned to a full commit SHA. A finding is ignored only inline, with a reason (`# zizmor: ignore[rule]`).

Both tools are pinned to exact versions, which Dependabot does not update: the template bumps them.

**AI agent guardrails:** the rules for the AI coding agent (Claude Code) live in [CLAUDE.md](CLAUDE.md), on top of the template's [core rules](.claude/rules/core.md). [.claude/settings.json](.claude/settings.json), from the template, denies the agent admin merges, force pushes and reading `.env` (a `Read` deny also blocks editing it), lists the open issues and pull requests at the start of each session, and enables the [`mission` plugin](https://github.com/brunoccalmeida/automation-template/blob/main/plugins/mission/README.md), which closes each mission with a Definition of Done, an independent reviewer and native auto-merge. Those rules match the text of a command, so they are a safety net and not a security boundary: the boundary is the ruleset on `main`, which has no bypass and applies to everyone.

## License

MIT, see [LICENSE](LICENSE).
