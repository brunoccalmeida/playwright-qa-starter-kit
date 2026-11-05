# Playwright QA Starter Kit

A reusable Playwright + TypeScript starter kit for QA engagements: E2E and API tests, CI on GitHub Actions and a published HTML report.

The target application is the [Restful Booker Platform](https://automationintesting.online), a hotel booking demo built for testers.

> 🚧 Work in progress: the kit is being built mission by mission.

## Development

Requires Node.js (version in [.node-version](.node-version)).

```sh
npm ci          # install the exact locked dependencies
npm run check   # type-check, lint and format check
```

## Continuous integration

Every pull request runs the [CI workflow](.github/workflows/ci.yml). `main` is protected by a ruleset: changes land only through a squash-merged pull request whose `ci-passed` check is green on an up-to-date branch. `ci-passed` is the single required check; it succeeds only when every other job of the workflow succeeded, so new jobs are added to its `needs`, never to the ruleset.

Dependabot opens weekly grouped updates for npm and GitHub Actions ([config](.github/dependabot.yml)).

## License

MIT, see [LICENSE](LICENSE).
