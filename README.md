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
```

Configuration comes from environment variables ([.env.example](.env.example)), validated at startup by [src/config/env.ts](src/config/env.ts): a missing or invalid variable stops the run with a message naming it. Variables set in the shell take precedence over `.env`.

## Tests

| Layer | Where                    | What it covers                                      |
| ----- | ------------------------ | --------------------------------------------------- |
| API   | [tests/api/](tests/api/) | Status codes, response contracts and business rules |

- **Typed clients** per resource live in [src/api/](src/api/) and return the raw response.
- **`expectJson(response, status, schema)`** asserts the status, the JSON content type and the [zod](https://zod.dev) contract, and returns the typed body; failures show the URL and the raw body.
- **Fixtures** ([tests/fixtures.ts](tests/fixtures.ts)) give each test its own data, such as a fresh `adminToken` and a `room` nobody else books.
- **Data factories** ([src/data/factories.ts](src/data/factories.ts)) build unique payloads (name suffixes, random future dates): the target app is a shared environment, so tests never rely on existing data or on each other. Never assert that a new resource is empty: the environment periodically wipes data and can hand a new room the bookings of an old one.
- **Known application bugs** are tests marked `test.fail()` that link to [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): they assert the correct behaviour, and start "failing" when the bug is fixed.

## Continuous integration

Every pull request runs the [CI workflow](.github/workflows/ci.yml). `main` is protected by a ruleset: changes land only through a squash-merged pull request whose `ci-passed` check is green on an up-to-date branch. `ci-passed` is the single required check; it succeeds only when every other job of the workflow succeeded, so new jobs are added to its `needs`, never to the ruleset.

The `api` job reads the admin credentials from the repository secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Set them both as **Actions** and as **Dependabot** secrets: workflows triggered by Dependabot can only read Dependabot secrets.

Dependabot opens weekly grouped updates for npm and GitHub Actions ([config](.github/dependabot.yml)). TypeScript majors are ignored while `typescript-eslint` rejects them as a peer dependency; [a sentinel](scripts/check-dependency-ignores.ts) in `npm run check` fails as soon as that is no longer true, so the ignore rule never outlives its reason.

## License

MIT, see [LICENSE](LICENSE).
