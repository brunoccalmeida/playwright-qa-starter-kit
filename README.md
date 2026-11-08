# Playwright QA Starter Kit

[![CI](https://github.com/brunoccalmeida/playwright-qa-starter-kit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/brunoccalmeida/playwright-qa-starter-kit/actions/workflows/ci.yml)
[![Test report](https://img.shields.io/badge/test%20report-GitHub%20Pages-blue)](https://brunoccalmeida.github.io/playwright-qa-starter-kit/)
[![Playwright version](https://img.shields.io/github/package-json/dependency-version/brunoccalmeida/playwright-qa-starter-kit/dev/%40playwright%2Ftest)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**English** | **[Português (Brasil)](README.pt-BR.md)**

A reusable Playwright + TypeScript starter kit for QA engagements: E2E and API tests, CI on GitHub Actions and a published HTML report.

The target application is the [Restful Booker Platform](https://automationintesting.online), a hotel booking demo built for testers.

## At a Glance

- **Tests:** 29 API · 9 E2E, each E2E test on Chromium and on Firefox, against a live environment shared with other testers
- **Defects found and tracked:** 6 in the application under test, [documented](docs/KNOWN_ISSUES.md) and each asserted by a test that signals when the defect is fixed
- **Quality gates:** `main` only accepts a pull request that passes strict type-checking, lint, the tests, `npm audit`, secret scanning (gitleaks) and a workflow audit (zizmor)
- **Live report:** HTML, republished on every merge and every night: 📊 **[View the latest test report](https://brunoccalmeida.github.io/playwright-qa-starter-kit/)**
- **Reusable:** a [step-by-step guide](docs/ADAPTING.md) takes the kit to a new client application
- **AI-assisted, same gates:** built with an AI coding agent that gets no shortcut past CI, under [written project rules](.github/copilot-instructions.md): every test was seen failing before it counted

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
- **Fixtures** ([tests/fixtures.ts](tests/fixtures.ts)) give each test its own data, such as a fresh `adminToken` and a `room` nobody else books.
- **Data factories** ([src/data/factories.ts](src/data/factories.ts)) build unique payloads (name suffixes, random future dates): the target app is a shared environment, so tests never rely on existing data or on each other. Never assert that a new resource is empty: the environment periodically wipes data and can hand a new room the bookings of an old one.
- **Page objects** ([src/pages/](src/pages/)) expose user-facing locators and actions; tests make the assertions. A page's `goto()` returns only once the page is ready to use, not in an intermediate state: a URL that changes before the content renders, or a form that the room list (loading above it) is about to push down. `expectLoaded()` proves the session after a UI login.
- **Admin session:** the `setup` project logs in through the UI once per run and saves the session to `playwright/.auth/admin.json` (ignored by Git: it grants access to the admin account). E2E tests run as a guest; an admin spec opts in with `test.use({ storageState: ADMIN_SESSION })` ([tests/e2e/fixtures.ts](tests/e2e/fixtures.ts)).
- **Browsers:** each journey runs on Chromium and on Firefox (projects `chromium` and `firefox`); both reuse the one admin session, a cookie valid in any browser.
- **Secrets stay out of the report:** Playwright titles input steps with the value (`Fill "<value>"`), so a password is typed with `fillSecret` ([src/pages/fill-secret.ts](src/pages/fill-secret.ts)), and ESLint rejects passing a password, secret or token to `fill` and the keyboard methods (on a locator or on `page`). An `expect` message is the step title even when the assertion passes, so ESLint also rejects messages built from data; `expectJson` and `expectStatus` put the response body in the error only on failure. A test that fails mid-login can still print it in the error details: treat the report of a client with real credentials as sensitive.
- **Known application bugs** are tests marked `test.fail(title, knownIssue('KI-n'), body)` that link to [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): they assert the correct behaviour, and start "failing" when the bug is fixed. In the report they carry the `@known-issue` tag and a sentence explaining the expected failure ([tests/known-issues.ts](tests/known-issues.ts)).
- **Workarounds for blocking bugs:** when an app bug blocks a whole journey, the browser test replaces only the broken call with `page.route` and keeps the rest real ([src/pages/known-issue-workarounds.ts](src/pages/known-issue-workarounds.ts)); the bug itself stays tracked by its `test.fail()` test. Example: the reservation page is blank because `GET /api/room/{id}` returns 500 (KI-1), so the booking journey serves that room from `GET /api/room`.

## Continuous integration

Every pull request runs the [CI workflow](.github/workflows/ci.yml). `main` is protected by a ruleset: changes land only through a squash-merged pull request whose `ci-passed` check is green on an up-to-date branch. `ci-passed` is the single required check; it succeeds only when every other job of the workflow succeeded, so new jobs are added to its `needs`, never to the ruleset.

**Test report:** the `api` and `e2e` jobs each write a blob report, and the `report` job merges them into one HTML report (also on pull requests, as the `github-pages` artifact). The `deploy` job publishes the report of `main` on [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/): after each merge and after the nightly run against the live app (06:23 UTC). Failing runs are published too: they are the report most worth reading. Traces stay off in CI because they would store the credentials; a failed test keeps a screenshot.

The `api` and `e2e` jobs read the admin credentials from the repository secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Set them both as **Actions** and as **Dependabot** secrets: workflows triggered by Dependabot can only read Dependabot secrets.

Dependabot opens weekly grouped updates for npm and GitHub Actions ([config](.github/dependabot.yml)). TypeScript majors are ignored while `typescript-eslint` rejects them as a peer dependency; [a sentinel](scripts/check-dependency-ignores.ts) in `npm run check` fails as soon as that is no longer true, so the ignore rule never outlives its reason.

The `e2e` job runs in the official Playwright container image, which ships the browsers and their system libraries, so no run depends on an `apt` mirror. The image tag must match `@playwright/test`, and Dependabot does not bump it: [another sentinel](scripts/check-playwright-image.ts) fails `npm run check` in the Dependabot pull request that bumps Playwright, until the tag and digest in the workflow are updated in that same pull request (the `e2e` job's comment shows how to get the digest).

The `audit` job runs `npm audit` and fails on any known vulnerability, so a pull request cannot add or keep one. It reads the same advisory database as Dependabot alerts, which watch `main` between pull requests. Fix a vulnerable transitive dependency by pinning the patched version in `overrides` in `package.json`.

Two jobs guard the repository itself:

- `secret-scan` runs [gitleaks](https://github.com/gitleaks/gitleaks) over the whole history of the tested commit (on a pull request, what `main` would contain), so a secret committed and deleted later in the same pull request still fails it. Other branches are left to GitHub secret scanning, which watches every branch for known provider tokens; enable it (with push protection) in a copy of the kit. Logs are redacted. A real secret is rotated first, then removed; a false positive is allowed with a `gitleaks:allow` comment on the line or its fingerprint in `.gitleaksignore`.
- `workflow-audit` runs [zizmor](https://docs.zizmor.sh) on the workflows and fails on any finding: template injection, excessive permissions, persisted credentials, and any action not pinned to a full commit SHA. A finding is ignored only inline, with a reason (`# zizmor: ignore[rule]`).

Both tools are pinned to exact versions in the workflow, which Dependabot does not update: bump them by hand.

**AI agent guardrails:** the rules for AI coding agents live in [.github/copilot-instructions.md](.github/copilot-instructions.md), shared by Claude Code and GitHub Copilot. [.claude/settings.json](.claude/settings.json) denies the agent admin merges, force pushes, pushes to `main` and reading or editing `.env`. Those rules match the text of a command, so they are a safety net and not a security boundary: the boundary is the ruleset on `main`, which has no bypass and applies to everyone.

## License

MIT, see [LICENSE](LICENSE).
