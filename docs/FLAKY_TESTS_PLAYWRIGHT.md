# Flaky tests: how this kit applies the policy

The policy is [FLAKY_TESTS.md](FLAKY_TESTS.md). It comes from [automation-template](https://github.com/brunoccalmeida/automation-template) and holds for every stack, so it is not edited here. This file holds what belongs to this kit's stack, Playwright against a shared environment: how a flake is seen on the same commit (policy section 1), the evidence a failure leaves (section 2), how the runner meets section 3, and how to quarantine (section 5). Section numbers below refer to the policy.

## Seeing it on the same commit (section 1)

In CI, Playwright's retries prove it within the run: a test that fails and then passes on a retry is reported as `flaky`, and the run fails (see "Retries that only diagnose" below). Otherwise, a GitHub Actions re-run [uses the same `GITHUB_SHA`](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs), so it is a valid check.

The issue names the test by project, file and title. Copy the evidence into it: the blob reports and the `github-pages` artifact of a pull request expire after **1 day**.

## Evidence on failure (section 2)

| Layer                | Evidence on failure                                                                                                                                                                                                          | Where                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API (`api`)          | The error with the URL and the raw response body (`expectJson`, `expectStatus`). A refused booking (`createBooking`) also lists the requested dates and the room's bookings at that moment                                   | Job log (`list` and `github` reporters); `blob-report-api` artifact; the merged HTML report                                                                                       |
| E2E (`e2e`)          | Screenshot of each failed attempt and the error context (page snapshot)                                                                                                                                                      | Job log; `blob-report-e2e` artifact; the merged HTML report                                                                                                                       |
| Both, `room` fixture | A failed test whose room vanished, deleted by something other than the test itself, gets an `Environment:` error naming the room and listing the room ids at that moment                                                     | Job log; the merged HTML report                                                                                                                                                   |
| Both, locally        | Trace of each failed attempt (`retain-on-failure`), opened with `npx playwright show-trace`. Traces stay off in CI: they store the credentials and the session cookie, and the report is public (see `playwright.config.ts`) | `test-results/`                                                                                                                                                                   |
| Report               | The `report` job merges both blobs into one HTML report                                                                                                                                                                      | `github-pages` artifact on a pull request (1 day); [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/) for `main` and the nightly run, until the next run |

Before re-running a failure locally, save the whole output and `test-results/` (or pass `--output` to another folder): a re-run deletes the traces.

To look for earlier occurrences, search the logs of green jobs too: `gh run view --log-failed` and the list of failed runs show only what ended red, and before this policy a flake that passed on a Playwright retry left its job green. The `list` reporter prints `N flaky` in the job log, read with `gh api repos/{owner}/{repo}/actions/jobs/{job_id}/logs`. To find the jobs of a run, including those of each manual re-run, use [`actions/runs/{run_id}/jobs?filter=all`](https://docs.github.com/en/rest/actions/workflow-jobs).

## Retries that only diagnose (section 3)

This kit takes the policy's second option. CI runs with `retries: 2` and [`failOnFlakyTests`](https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests) (`playwright.config.ts`). Locally, retries are off, so a failure shows on the first run.

- **Why keep retries:** in one run, the retry proves that the failure and the pass came from the same commit, and it keeps the evidence of each attempt. The target application is a shared environment, so telling a flake from a real failure quickly matters.
- **Why fail the run:** Playwright reports a pass on retry as [`flaky`](https://playwright.dev/docs/test-retries), but by default it still exits 0. In 2 of the 3 cases of [#42](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/42), exactly that happened. Google reports that its own "fail only 3 times in a row" option "encourages developers to ignore flakiness".
- **Enforced:** [`scripts/check-flaky-policy.ts`](../scripts/check-flaky-policy.ts), in `npm run check`, runs a test that fails on its first attempt and passes on the retry, with the real config's retry settings in CI mode, and fails if the run exits 0.

In Playwright terms, the policy's "wait on a condition" means web-first assertions and waits such as `expect(locator).toHaveText()` and `page.waitForResponse()`; fixed waits (`waitForTimeout`) are rejected by ESLint. Its "polling a read" means `expect(...).toPass()` and `expect.poll()` on a read; wrapping the action under test in them is a retry in disguise.

_Judgment call:_ the policy of the sibling project [uat-automation-framework](https://github.com/brunoccalmeida/uat-automation-framework/blob/master/docs/FLAKY_TESTS.md) bans retries, because its runner reports a pass on retry as a plain pass. Playwright reports it as `flaky`, and `failOnFlakyTests` turns it red, so retries here add evidence without hiding anything.

## Forcing the condition and reproducing (section 4)

To force a race instead of repeating until it shows, delay a response with `page.route` and `route.continue()` after a wait (`route.fulfill()` with a delay left Firefox without rendering, in [#25](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/25)).

To reproduce a failure seen only in CI, run the suite in the official Playwright image, as the `e2e` job does (`mcr.microsoft.com/playwright:v<version>-noble`, `CI=true`, `--ipc=host`), and repeat without retries: `npx playwright test <file> --repeat-each=20 --retries=0`.

## Quarantine (section 5)

Tag the test `@quarantine` and add an annotation with the issue, `{ tag: '@quarantine', annotation: { type: 'issue', description: '<issue URL>' } }`. The first quarantine must also add `--grep-invert @quarantine` to the `test:api` and `test:e2e` runs of the CI jobs. The policy's "expected-failure marker" is `test.fail()`, reserved for known application defects; a skip is `test.skip()` or `test.fixme()`. Run a quarantined test on demand with `npx playwright test --grep @quarantine --retries=0`.

No test is in quarantine today.

## Worked example: the Firefox admin-rooms flake (#25)

1. **Seen.** On the first deploy of the report, `admin-rooms.spec.ts` failed on Firefox and passed on the retry, so CI stayed green; it was noticed only in the published report. Under this policy, that run is red.
2. **Hypotheses, each tested with a probe.** "The room list resets the form": refuted, the checkbox stayed checked with `GET /api/room` delayed. "A response remounts the checkbox": refuted, the original element stayed in the DOM (`isConnected`).
3. **Observed.** Layout shift. The room rows load above the form and push it down (the TV checkbox moves from y = 132 to y = 892 with 11 rooms). The page object returned as soon as the page header showed, before `GET /api/room` was even sent. If the list arrived between Playwright computing the click position and the click, the click landed on a room row: `Clicking the checkbox did not change its state`.
4. **Forced, not repeated.** 20 + 60 local repetitions did not reproduce it. A probe that delayed `GET /api/room` by 3 s did, on both browsers: `Expected: 11, Received: 0` rows right after `goto()`.
5. **Fixed.** `AdminRoomsPage.goto()` registers `waitForResponse` for `GET /api/room` before navigating and returns only when the rows on screen match the rooms in that response.
6. **Proved.** The probe went green, 3 of 3, and the E2E suite went 91 of 91 in the Playwright container, with `--repeat-each=5 --retries=0`.

## Open case: the missing login error on Firefox (#62)

1. **Seen.** In one local full run, `wrong password shows an error` failed on Firefox: no alert with text within 5 s, although the trace showed the login request answered `401`. The issue kept the response time stamp but not the click time or the request duration, and the trace is gone. 15 + 15 isolated repetitions passed: with an unknown failure rate they rule out only high rates (at 5 %, 30 green runs happen by chance 21 % of the time).
2. **Ruled out by the source.** "The layout's auth check resets the form": a guest has no `token` cookie, so [`postValidation`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/assets/src/app/admin/layout.tsx) returns `false` without calling `/ui-api/auth/validate`, and [`Nav`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/assets/src/components/admin/Nav.tsx) renders `Logout` for everyone, so the button in the snapshot is no sign of a session. "The click lands before hydration": the login request went out, so the form's handler was attached.
3. **Injected.** A probe that delayed the login response with `page.route` reproduced the exact failure at 6 s (form still filled, empty alert) and passed at 3 s. [`Login`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/assets/src/components/admin/Login.tsx) shows the error only after the response arrives, so the assertion's 5 s window started at the click. A slow response is therefore a **sufficient** cause; that it **happened** is not observed.
4. **Changed.** `AdminLoginPage.login()` registers `waitForResponse` for `POST /ui-api/auth/login` before the click and returns the response; the test asserts the `401` first. The evidence now tells the causes apart: a missing response fails on the network, and an alert still missing after a confirmed `401` rules out the slow response.
5. **Checked.** The 6 s probe passed on both browsers. The login spec went 41 of 41 with `--repeat-each=10 --retries=0`; at a 5 % failure rate, 40 green runs happen by chance 13 % of the time, so this is supporting evidence only. The issue stays open until a recurrence, or its absence, says more.

## Worked example: a booking refused with 409 (#42, #54)

1. **Seen.** In 3 of 36 CI attempts up to 2026-11-08, the first bookings of a run were refused with `409` for 3 to 5 seconds (#42). On 2026-11-26, two refused bookings found the room already holding a booking with exactly the requested (random) dates (#54). 32 local passes on 2026-11-27 showed no refusal: supporting evidence only (section 4).
2. **Ruled out by the source.** The booking service answers `409` only before it stores anything, and after storing it only sends the guest's message ([`BookingService.java`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/booking/src/main/java/com/automationintesting/service/BookingService.java#L110-L119)); a stored booking refused with `409` therefore takes two requests. The second one is the UI API retrying the `500` that the service returns when sending the guest's message fails after the booking is stored ([KI-8](KNOWN_ISSUES.md#ki-8-a-stored-booking-is-refused-with-409)).
3. **Forced, not repeated.** Instead of waiting for the message service to fail in the shared environment, a probe made it fail on demand: a valid email address of 256 characters, one more than its column holds, was refused with `409` after 1.3 s and the booking was stored; 255 characters gave `201` in 0.2 s. The same address without a phone gave `201`: with no email or phone, the booking service does not call the message service.
4. **Pinned.** The defect is an application bug, so it gets a `test.fail()` (`does not refuse a booking it stored`), seen failing for the bug's reason (`{status: 409, stored: true}`) and passing with 255 characters.
5. **Fixed in the support code.** `newBooking` leaves out email and phone, so the tests that do not test the guest's message stop depending on the message service; `newGuestBooking` adds them where the test needs them (the reservation form, the KI-8 test). The browser reservation keeps them, as a guest sends them, and can still meet KI-8.
6. **Why it closes.** Observed in CI: a booking stored with exactly the requested random dates and refused with `409`. By the source, the only path to that state is a failure after the booking is stored, and the only step there is the message call. Injected, not observed: the message service failing. The fix does not depend on why it failed: the API tests no longer call it. Unlike #62, where the source leaves more than one cause, here it leaves one. A refusal over 1 s marked `(same guest as the request)` in a test **without** email refutes this and reopens the case.

## Worked example: admin tests sent to the login page (#70)

1. **Seen.** Three times on 2026-11-27, every admin E2E test from some point on failed at `AdminRoomsPage.goto` with the login form on screen: once locally on both browsers, once in CI on Firefox only (all 3 attempts), and once in a local `--repeat-each=30` run from Firefox repeat 23 to the end, where the KI-5 `test.fail()` passed for the wrong reason. The API tests, which log in per test, recovered at once.
2. **Ruled out by the source.** The auth service accepts a token while it is in its table: the stored expiry is never read, and a login only adds a token ([`AuthService.java`](https://github.com/mwinteringham/restful-booker-platform/blob/trunk/auth/src/main/java/com/automationintesting/service/AuthService.java)). "The token expires after 12 minutes" and "another admin's login ends ours" are refuted. What removes tokens is the service's scheduled reset, which deletes them all every `dbRefresh` minutes ([`DatabaseScheduler.java`](https://github.com/mwinteringham/restful-booker-platform/blob/trunk/auth/src/main/java/com/automationintesting/service/DatabaseScheduler.java), [`AuthDB.resetDB`](https://github.com/mwinteringham/restful-booker-platform/blob/trunk/auth/src/main/java/com/automationintesting/db/AuthDB.java)), and the service's own logout. The UI API logout does not reach it ([KI-3](KNOWN_ISSUES.md#ki-3-logout-does-not-invalidate-the-token)).
3. **Forced, not repeated.** A probe logged the saved session's token out through the service (`POST /api/auth/logout`, the same row deletion as the reset): `validate` went from `200` to `403`, and the admin spec failed 4 of 4 regular tests at the login form, with both KI-5 tests "passing".
4. **Fixed in the support code.** The `setup` project and its saved session are gone. `adminTest` adds the `token` cookie from each test's own API login (`adminToken`), so a reset reaches only the test running at that moment, and a retry gets a new session.
5. **Proved.** With every earlier token logged out through the service before each test (`--workers=1 --repeat-each=3`, both browsers), the spec passed 18 of 18; the same condition failed the saved session in step 3. The KI-5 test, run as a plain `test`, still fails for its own reason (`Room #` has no label).
6. **What remains.** A reset during an admin test still fails it, and can still make a `test.fail()` pass for the wrong reason, since `test.fail()` accepts any failure (step 3). The window shrinks from the rest of the run to the one test running at the reset; closing it is [#78](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/78).

## Sources

Read on 18/11/2026, for Playwright 1.64.1.

- Playwright, [Retries](https://playwright.dev/docs/test-retries): the `passed`, `flaky` and `failed` outcomes, and isolated tests to make retries safe.
- Playwright, [TestConfig: `failOnFlakyTests`](https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests) (since 1.52): "Whether to exit with an error if any tests are marked as flaky. Useful on CI."
- Google Testing Blog, [Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html): the cost of retries and of quarantine.
- GitHub Docs, [Re-running workflows and jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs): a re-run uses the same commit.
