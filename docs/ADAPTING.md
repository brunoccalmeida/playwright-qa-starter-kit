<!-- LTeX: language=en-US -->

# Adapting the kit to a new application

This guide takes the kit from its demo target, the [Restful Booker Platform](https://automationintesting.online), to the application of a new client. It is written for the QA engineer starting the engagement.

You need Node.js (the version in [.node-version](../.node-version)), an authenticated [GitHub CLI](https://cli.github.com), a Bash shell (Git Bash on Windows) and access to a test environment of the application. Follow the steps in order: each one ends with something you can check.

## 1. Make three decisions first

| Decision    | Recommendation                                                                                          | Why                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository  | A new repository, private unless the client agrees otherwise. Not a fork.                               | [A fork of a public repository is public](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks), and its visibility cannot be changed on its own. |
| Environment | A dedicated test environment and a test account with only the permissions tests need. Never production. | The suite creates data on every run, and the nightly run does so unattended. The application may offer no way to remove that data.                                                                                                  |
| Report      | Do not publish it on GitHub Pages unless the client accepts a public report.                            | The report shows URLs, test data and response bodies. A test that fails mid-login can print a password in its error details.                                                                                                        |

### What a private repository changes

| Feature                | On a private repository                                                                                                                                                                                                                 | What to do                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Protected branches     | [Listed for GitHub Pro and Team](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), not for GitHub Free.                                                                                                      | Use a paid plan: without protection, nothing forces changes through CI.                     |
| GitHub Pages           | Needs a paid plan, and [restricting who can read the site needs GitHub Enterprise Cloud](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site). | Remove the `deploy` job ([step 6](#keep-the-report-private)) unless the site may be public. |
| GitHub secret scanning | [Needs GitHub Secret Protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning) on an organization-owned repository.                                                                      | Nothing required: the `secret-scan` job runs gitleaks on any repository.                    |
| GitHub Actions         | Runs consume [the compute included in the plan](https://docs.github.com/en/get-started/learning-about-github/githubs-plans).                                                                                                            | Budget for two browsers on each pull request, each merge and each night.                    |

## 2. Create the repository

Start from a fresh history: the new repository should not carry this kit's commits, and [a repository with a single first commit](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template) is also what GitHub's own template feature produces.

```sh
git clone --depth 1 https://github.com/brunoccalmeida/playwright-qa-starter-kit client-qa
cd client-qa
rm -rf .git
```

**Before the first commit**, set `BASE_URL` in the `api` and `e2e` jobs of `.github/workflows/ci.yml` to the new application's URL. The nightly run uses the workflow on `main`: if `main` still pointed at the demo when you add the secrets in [step 6](#6-configure-github), the client's credentials would be sent to a third-party site.

```sh
git init -b main
git add -A
git commit -m "chore: start from the Playwright QA starter kit"
gh repo create <owner>/<repo> --private --source . --push
npm ci
npx playwright install chromium firefox
```

The CI run of this first push fails: the repository has no secrets yet.

**Check:** without any configuration, `npx playwright test --list` stops before running anything and names each missing variable (`BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`).

## 3. Point the kit at the new application

Work on a branch from here on: the ruleset of step 6 rejects pushes to `main`, and step 7 opens a pull request from it.

Copy `.env.example` to `.env` (Git ignores it) and set the URL and the test account. Then find every reference to the demo:

```sh
git switch -c adapt-kit
grep -rnE 'automationintesting|brunoccalmeida|Restful Booker' . \
  --exclude-dir={node_modules,.git,playwright,playwright-report,test-results,blob-report}
```

| File                              | What to change                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `.env.example`                    | The URL and the comment. It holds public demo credentials: never put a client's real ones here.                     |
| `.github/workflows/ci.yml`        | `PLAYWRIGHT_HTML_TITLE` in the `report` job (`BASE_URL` was set in step 2).                                         |
| `tests/known-issues.ts`           | The `KNOWN_ISSUES` URL: the report's links to each defect would otherwise open this kit's list.                     |
| `docs/KNOWN_ISSUES.md`            | The introduction and the report link. The entries go in step 4.                                                     |
| `README.md`, `README.pt-BR.md`    | Rewrite them for the client: badges, target application and report links.                                           |
| `.github/copilot-instructions.md` | "O que é este projeto": the rules the AI agents load in every chat.                                                 |
| `docs/PROJECT_SESSION_SUMMARY.md` | Replace it with an empty summary: it is the history of this kit, not of the client's project.                       |
| `docs/ADAPTING.md`                | Delete it once the adaptation is done: the client's project has no use for it.                                      |
| `package.json`                    | `name`, `description` and `author`; then run `npm install --package-lock-only` so the lockfile keeps the same name. |

Keep the [LICENSE](../LICENSE): the MIT license requires its notice to stay in copies of the kit.

If the application does not log in with a username and a password, change the variables in [src/config/env.ts](../src/config/env.ts), `.env.example` and the two jobs of the workflow together.

**Check:** the `grep` above lists nothing you did not choose to keep.

## 4. Remove the demo application

The login code stays, to be adapted in step 5: every browser project depends on it. The rest is specific to hotel bookings.

```sh
rm src/api/{booking,message,room}-api.ts src/data/factories.ts
rm src/pages/{home,reservation}-page.ts src/pages/known-issue-workarounds.ts
rm tests/api/{bookings,messages,rooms}.spec.ts
rm tests/e2e/{admin-rooms,contact,home,reservation}.spec.ts
```

`npx tsc` now lists what still refers to the deleted files. Fix each one:

| File                            | What to change                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `tests/fixtures.ts`             | Keep `authApi` and `adminToken`; remove the other fixtures and their imports.                                  |
| `tests/e2e/fixtures.ts`         | Keep `ADMIN_SESSION`, `adminLoginPage` and `adminRoomsPage`; remove the other page fixtures and their imports. |
| `src/pages/admin-rooms-page.ts` | Keep only the locator and `expectLoaded()`: this becomes the page an admin lands on after logging in.          |
| `tests/api/auth.spec.ts`        | Remove the `test.fail` for KI-3 and the `knownIssue` import.                                                   |
| `tests/known-issues.ts`         | Empty the map: `export const knownIssueTitles = {} as const;`                                                  |
| `docs/KNOWN_ISSUES.md`          | Delete every `## KI-n` entry.                                                                                  |

These parts carry over without changes: [expect-json.ts](../src/api/expect-json.ts), [fill-secret.ts](../src/pages/fill-secret.ts), [playwright.config.ts](../playwright.config.ts), [eslint.config.mjs](../eslint.config.mjs), the sentinels in [scripts/](../scripts/) and the jobs of the CI workflow.

**Check:** `npm run check` exits with 0.

## 5. Write the tests for the new application

**Explore before you code.** Map the API with the application's documentation or the browser's network panel, and read the accessibility tree the way `getByRole` does (`npx playwright codegen`, or `ariaSnapshot()`). The demo proved why: several endpoints did not behave as a first look suggested, and each difference would have become a wrong client.

**Start with the login**, because the browser projects depend on it:

1. [src/api/auth-api.ts](../src/api/auth-api.ts) and [tests/api/auth.spec.ts](../tests/api/auth.spec.ts): endpoints, contracts and error messages.
2. [src/api/schemas.ts](../src/api/schemas.ts): the application's error formats, and how protected endpoints read the session (`authCookie`).
3. [src/pages/admin-login-page.ts](../src/pages/admin-login-page.ts), the page after login and [tests/e2e/admin-login.spec.ts](../tests/e2e/admin-login.spec.ts), which holds the demo's error message. `expectLoaded()` must wait for something only a logged-in user sees: a URL can change before the login has been accepted.
4. [tests/e2e/admin.setup.ts](../tests/e2e/admin.setup.ts). It logs in through the UI because the demo's login API sets no cookie. If the application's API does set it, [log in through the API](https://playwright.dev/docs/auth): it is faster.

**Then add one resource at a time:** a contract (zod schema), a typed client in `src/api/`, a fixture, and the tests. The [demo's data factories](https://github.com/brunoccalmeida/playwright-qa-starter-kit/blob/main/src/data/factories.ts) show how to build unique payloads.

| Rule                                 | How it applies                                                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every test was seen failing          | Write the test before its client or page object, or change an expected value and watch it fail. A test that has never failed proves nothing.                                                                                                 |
| Business rules go to the API layer   | Faster and more stable. A browser test covers only what needs a browser.                                                                                                                                                                     |
| Each test creates its own data       | Unique names and dates. Never assume what already exists, and never assert that a new resource is empty.                                                                                                                                     |
| User-facing locators                 | `getByRole`, `getByLabel`, `getByText`. `getByTestId` only when there is no accessible alternative: that gap is itself worth reporting.                                                                                                      |
| A defect in the application          | Add it to `docs/KNOWN_ISSUES.md` and to the map in `tests/known-issues.ts` with an identical title, then write `test.fail(title, knownIssue('KI-n'), body)`. First run it as a plain `test` and confirm that it fails because of the defect. |
| A new assertion helper               | Add its name to `assertFunctionNames` in `eslint.config.mjs`, or `playwright/expect-expect` rejects the tests that use only it.                                                                                                              |
| Passwords and tokens                 | Type them with `fillSecret`. ESLint rejects passing them to `fill`.                                                                                                                                                                          |
| A defect that blocks a whole journey | Replace only the broken call with `page.route` and keep tracking the defect with its `test.fail()` test.                                                                                                                                     |

If the environment cannot take parallel load, lower `workers` or turn off `fullyParallel` in `playwright.config.ts`.

**Check:** `npm test` passes, and `npm run check` still exits with 0.

## 6. Configure GitHub

These settings live outside Git, so a new repository starts without them.

**Secrets.** `gh` prompts for each value, which keeps it out of the shell history. Both stores are needed: [workflows triggered by Dependabot read only Dependabot secrets](https://docs.github.com/en/code-security/dependabot/troubleshooting-dependabot/troubleshooting-dependabot-on-github-actions).

```sh
gh secret set ADMIN_USERNAME
gh secret set ADMIN_PASSWORD
gh secret set ADMIN_USERNAME --app dependabot
gh secret set ADMIN_PASSWORD --app dependabot
```

**Merge settings.** Squash only, with the pull request's title and body as the commit message:

```sh
gh api --method PATCH repos/<owner>/<repo> \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F allow_auto_merge=true -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

**Ruleset.** `ci-passed` is the only required check, so adding a job to the workflow never means editing the ruleset. `15368` is the ID of the GitHub Actions app. With no reviewers on the project, set `required_approving_review_count` to 0, because GitHub does not let authors approve their own pull requests; on a team, raise it.

```sh
gh api --method POST repos/<owner>/<repo>/rulesets --input - <<'EOF'
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "allowed_merge_methods": ["squash"],
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_approving_review_count": 0,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "ci-passed", "integration_id": 15368 }]
      }
    }
  ]
}
EOF
```

**Security features.** In the repository's security settings, enable Dependabot alerts and security updates and, where the plan includes them, secret scanning and push protection.

### Publish the report

Only if the report may be public: under **Settings → Pages**, set **Source** to **GitHub Actions**. The `deploy` job does the rest after each merge and each nightly run.

### Keep the report private

Delete the `deploy` job from `.github/workflows/ci.yml`. The `report` job still builds the report as the `github-pages` artifact, which only people with access to the repository can download:

```sh
gh run download <run-id> --name github-pages   # then extract artifact.tar
```

The artifact expires after one day by default. To keep it longer, set `retention-days` on the `Upload Pages artifact` step.

### The nightly run

The workflow runs against the live application at 06:23 UTC. Agree on it with the client, since it creates data every night, or remove the `schedule` trigger. [GitHub disables a scheduled workflow after 60 days without activity only on a public repository](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): on a private one, do not count on it, and remove the trigger when the engagement ends.

## 7. Prove that it works

| Check                                                           | Expected result                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Open a pull request with the adapted kit                        | Every job and `ci-passed` are green.                                                                       |
| In a throwaway pull request, change an expected value in a test | The test job and `ci-passed` fail, and the pull request is blocked from merging. Close it without merging. |
| Merge the adapted kit, then read the report (Pages or artifact) | The report opens and lists the new application's tests.                                                    |
| With a known issue recorded, open its link in the report        | It opens that entry in the new repository's `docs/KNOWN_ISSUES.md`.                                        |

The second check matters most: a gate that has never rejected anything has not been shown to work.

After that, Dependabot keeps most of the kit up to date. Three versions in the workflow are bumped by hand: the Playwright container image in the `e2e` job, which has to move together with `@playwright/test`, and the versions of gitleaks and zizmor, which nothing flags when they get old. The [README](../README.md#continuous-integration) explains how.
