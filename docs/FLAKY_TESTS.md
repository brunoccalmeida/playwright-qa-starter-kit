# Flaky Test Policy

A test is flaky when it both passes and fails on the same code ([Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)). A flaky test is not a nuisance to route around: once a red build can mean "probably nothing", people stop reading red builds, and real failures go unnoticed along with the false ones ([Fowler](https://martinfowler.com/articles/nonDeterminism.html)).

**In short:** no test stays flaky. Every flake turns the run red, gets an issue, and is fixed and proved in its own mission. Retries only diagnose; they never pass a build. Quarantine is the last resort, and it has a deadline.

## 1. Record it

A red test is a real failure until shown otherwise. To call it flaky, see it pass on the **same commit**. In CI, Playwright's retries do that within the run: a test that fails and then passes on a retry is reported as `flaky`, and the run fails (section 3). Otherwise, a GitHub Actions re-run [uses the same `GITHUB_SHA`](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs), so it is a valid check.

Then it depends on which test flaked:

- **A test the pull request adds or changes:** the flake is a defect of that pull request. Fix it there; it does not merge flaky.
- **Any other test:** open an issue **before** re-running, titled `test: flaky <what failed>`, and handle it in its own mission.

The issue holds:

- the test ID (project, file and title) and the complete error of each failed attempt, not only its last line;
- the run URL and the commit SHA;
- the observed rate (failures / runs of that job);
- the evidence from section 2, copied into the issue: the blob reports and the `github-pages` artifact of a pull request expire after **1 day**;
- each hypothesis, labelled as a hypothesis until it is observed.

A manual re-run is allowed for two reasons: to confirm the flake, and to unblock unrelated work once the issue exists. It is never a way to make the failure go away unrecorded.

## 2. Instrument first

Do not guess at a cause the evidence cannot show. Failures already leave evidence:

| Layer         | Evidence on failure                                                                                                                                                                                                          | Where                                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API (`api`)   | The error with the URL and the raw response body (`expectJson`, `expectStatus`). A refused booking (`createBooking`) also lists the requested dates and the room's bookings at that moment                                   | Job log (`list` and `github` reporters); `blob-report-api` artifact; the merged HTML report                                                                                       |
| E2E (`e2e`)   | Screenshot of each failed attempt and the error context (page snapshot)                                                                                                                                                      | Job log; `blob-report-e2e` artifact; the merged HTML report                                                                                                                       |
| Both, locally | Trace of each failed attempt (`retain-on-failure`), opened with `npx playwright show-trace`. Traces stay off in CI: they store the credentials and the session cookie, and the report is public (see `playwright.config.ts`) | `test-results/`                                                                                                                                                                   |
| Report        | The `report` job merges both blobs into one HTML report                                                                                                                                                                      | `github-pages` artifact on a pull request (1 day); [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/) for `main` and the nightly run, until the next run |

If that evidence cannot tell the hypotheses apart, add the evidence first, test-first, and let the next failure answer. That includes failure messages: one message for two different causes is a bug in the instrumentation.

To look for earlier occurrences, search the logs of green jobs too: `gh run view --log-failed` and the list of failed runs show only what ended red, and before this policy a flake that passed on a Playwright retry left its job green. The `list` reporter prints `N flaky` in the job log, read with `gh api repos/{owner}/{repo}/actions/jobs/{job_id}/logs`. To find the jobs of a run, including those of each manual re-run, use [`actions/runs/{run_id}/jobs?filter=all`](https://docs.github.com/en/rest/actions/workflow-jobs).

## 3. Retries diagnose, they never pass a build

CI runs with `retries: 2` and [`failOnFlakyTests`](https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests) (`playwright.config.ts`). Locally, retries are off, so a failure shows on the first run.

- **Why keep retries:** in one run, the retry proves that the failure and the pass came from the same commit, which is section 1's check, and it keeps the evidence of each attempt. The target application is a shared environment, so telling a flake from a real failure quickly matters.
- **Why fail the run:** Playwright reports a pass on retry as [`flaky`](https://playwright.dev/docs/test-retries), but by default it still exits 0. The merge gate reads only pass or fail, so nobody would open the report to learn that a pass needed two attempts. In 2 of the 3 cases of [#42](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/42), exactly that happened. Google reports that its own "fail only 3 times in a row" option "encourages developers to ignore flakiness".
- **Enforced:** [`scripts/check-flaky-policy.ts`](../scripts/check-flaky-policy.ts), in `npm run check`, runs a test that fails on its first attempt and passes on the retry, with the real config's retry settings in CI mode, and fails if the run exits 0.

Not retries, and therefore fine:

- **Web-first assertions and waits on a condition** (`expect(locator).toHaveText()`, `page.waitForResponse()`): they poll for a state and do not repeat the action under test. Fixed waits (`waitForTimeout`) are rejected by ESLint.
- **`expect(...).toPass()` and `expect.poll()`** on a read, such as polling an API until a resource appears. Wrapping the **action under test** in them is a retry in disguise: it repeats the action until it works and hides why it did not.

_Judgment call:_ the policy of the sibling project [uat-automation-framework](https://github.com/brunoccalmeida/uat-automation-framework/blob/master/docs/FLAKY_TESTS.md) bans retries, because its runner reports a pass on retry as a plain pass. Playwright reports it as `flaky`, and `failOnFlakyTests` turns it red, so retries here add evidence without hiding anything. Without retries, the policy would hold just the same, but each flake would need a manual re-run to be told apart from a real failure.

## 4. Fix the cause and prove it

The issue closes with a root cause that was **observed**, not inferred, and one of two outcomes:

- **Fix.** The application, the test or its support code (page object, fixture, client) is corrected, and a test that pins the cause deterministically was seen failing. Repeating until the race shows up is not that test: force the condition instead. For example, delay a response with `page.route` and `route.continue()` after a wait (`route.fulfill()` with a delay left Firefox without rendering, in [#25](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/25)).
- **Delete or rewrite.** If other tests cover the behaviour, remove the test, or rewrite it at a lower level, such as an API test instead of a browser test. Name the test that covers it.

To reproduce a failure seen only in CI, run the suite in the official Playwright image, as the `e2e` job does (`mcr.microsoft.com/playwright:v<version>-noble`, `CI=true`, `--ipc=host`), and repeat without retries: `npx playwright test <file> --repeat-each=20 --retries=0`.

Repeated green runs are supporting evidence only, and the record must state their odds. With a failure rate `p`, `n` green runs happen by chance with probability `(1 - p)^n`:

| Failure rate | Green runs | Chance of all green with the bug still there |
| ------------ | ---------- | -------------------------------------------- |
| 1 in 9       | 10         | 31%                                          |
| 1 in 9       | 26         | under 5%                                     |

## 5. Quarantine: the last resort

Quarantine protects the healthy tests' signal, but a quarantined test detects nothing, and it can hide a real race ([Fowler](https://martinfowler.com/articles/nonDeterminism.html), [Google](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)). A flake that fails rarely stays in the suite: its next failure is the data the investigation needs.

**Criteria, all required:**

- the issue exists and holds the evidence collected so far;
- the flake keeps blocking unrelated work, despite the investigation;
- the issue names the behaviour that loses coverage while the test is out.

**Limits** (_judgment call_; Fowler recommends a numeric or time limit, with 8 tests and one week as his examples): at most **3 tests** at once and **14 days** per test, with the issue at `priority: P1` and its deadline written in it. Reaching a limit makes clearing the quarantine the next mission.

**How:** tag the test `@quarantine` and add an annotation with the issue, `{ tag: '@quarantine', annotation: { type: 'issue', description: '<issue URL>' } }`. The first quarantine must also add `--grep-invert @quarantine` to the `test:api` and `test:e2e` runs of the CI jobs. Never `test.fail()`, which is reserved for known application defects and fails when the test passes, nor `test.skip()` or `test.fixme()`, which leave no trace in the issue. The test then stops running in CI and produces no new evidence, so the issue must say how it will be run on demand (`npx playwright test --grep @quarantine --retries=0`) until the fix.

No test is in quarantine today.

## Worked example: the Firefox admin-rooms flake (#25)

1. **Seen.** On the first deploy of the report, `admin-rooms.spec.ts` failed on Firefox and passed on the retry, so CI stayed green; it was noticed only in the published report. Under this policy, that run is red.
2. **Hypotheses, each tested with a probe.** "The room list resets the form": refuted, the checkbox stayed checked with `GET /api/room` delayed. "A response remounts the checkbox": refuted, the original element stayed in the DOM (`isConnected`).
3. **Observed.** Layout shift. The room rows load above the form and push it down (the TV checkbox moves from y = 132 to y = 892 with 11 rooms). The page object returned as soon as the page header showed, before `GET /api/room` was even sent. If the list arrived between Playwright computing the click position and the click, the click landed on a room row: `Clicking the checkbox did not change its state`.
4. **Forced, not repeated.** 20 + 60 local repetitions did not reproduce it. A probe that delayed `GET /api/room` by 3 s did, on both browsers: `Expected: 11, Received: 0` rows right after `goto()`.
5. **Fixed.** `AdminRoomsPage.goto()` registers `waitForResponse` for `GET /api/room` before navigating and returns only when the rows on screen match the rooms in that response.
6. **Proved.** The probe went green, 3 of 3, and the E2E suite went 91 of 91 in the Playwright container, with `--repeat-each=5 --retries=0`.

## Open case: the first booking refused with 409 (#42)

The first bookings of a run were refused with `409` for 3 to 5 seconds, in 3 of 36 CI attempts; 2 of them passed on retry, unnoticed. The cause is not known yet. The likeliest hypothesis left, a booking inherited by a reset room id, has evidence against it ([KNOWN_ISSUES.md](KNOWN_ISSUES.md#test-environment-limit-rooms-and-bookings-reset-independently)). `createBooking` now records the room's bookings when a booking is refused, so the next occurrence carries the evidence. It will turn the run red: open a new issue that links to #42, and copy that evidence into it.

## Sources

Read on 18/11/2026, for Playwright 1.64.1.

- Playwright, [Retries](https://playwright.dev/docs/test-retries): the `passed`, `flaky` and `failed` outcomes, and isolated tests to make retries safe.
- Playwright, [TestConfig: `failOnFlakyTests`](https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests) (since 1.52): "Whether to exit with an error if any tests are marked as flaky. Useful on CI."
- Martin Fowler, [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html): why flaky tests ruin a suite, quarantine and its limits.
- Google Testing Blog, [Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html): definition and the cost of retries and of quarantine.
- GitHub Docs, [Re-running workflows and jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs): a re-run uses the same commit.
- uat-automation-framework, [Flaky Test Policy](https://github.com/brunoccalmeida/uat-automation-framework/blob/master/docs/FLAKY_TESTS.md): the source of this policy; sections 3 and 5 and the evidence table are adapted to Playwright.
