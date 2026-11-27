# Flaky test policy

A test is flaky when it both passes and fails on the same code. A flaky test is not a nuisance to route around. Once a red build can mean "probably nothing", people stop reading red builds, and real failures go unnoticed along with the false ones: "a failure in the healthy deterministic tests will get ignored too" ([Fowler](https://martinfowler.com/articles/nonDeterminism.html)).

**In short:** no test stays flaky. Every flake is recorded in an issue, its cause is observed, and the fix is proved in its own mission. A retry never turns a failing run green. Quarantine is the last resort, and it has a deadline.

This file comes from the template and holds the policy for every stack. How the test runner meets section 3, and what evidence a failure leaves (section 2), belong to the stack and are documented next to its configuration.

## 1. Record it

A red test is a real failure until shown otherwise. To call it flaky, see it pass on the **same commit**: a retry inside the run, or a CI re-run of the same commit.

Then it depends on which test flaked:

- **A test the pull request adds or changes:** the flake is a defect of that pull request. Fix it there; it does not merge flaky.
- **Any other test:** open an issue **before** re-running, titled `test: flaky <what failed>`, and handle it in its own mission.

The issue holds:

- the test ID and the complete error of each failed attempt, not only its last line;
- the run URL and the commit SHA;
- the observed rate (failures / runs of that job);
- the evidence from section 2, copied into the issue, because CI artifacts expire;
- each hypothesis, labelled as a hypothesis until it is observed.

A manual re-run is allowed for two reasons: to confirm the flake, and to unblock unrelated work once the issue exists. It is never a way to make the failure go away unrecorded.

## 2. Instrument first

Do not guess at a cause the evidence cannot show. Each failure leaves evidence (the error, and screenshots, traces or logs, depending on the stack); know where it is before the next failure needs it.

If that evidence cannot tell the hypotheses apart, add the evidence first, test-first, and let the next failure answer. That includes failure messages: one message for two different causes is a bug in the instrumentation.

Waiting for the next failure is not passive. Work through the candidate causes, most likely first:

1. **Rule out** each one that the evidence you already have contradicts.
2. **Reproduce** under the failing conditions (same layer, parallelism and environment), keeping each run's full output, and state the odds of the green runs (section 4).
3. **Inject** each remaining cause (block or slow a dependency, load the machine) to learn the signature it leaves in the evidence. An injection proves a cause is *sufficient*, never that it *happened*: its value is checking that the evidence tells the causes apart.

## 3. A retry never passes a build

Whatever the stack, a test that needed more than one attempt to pass fails the run. Each stack meets this in one of two ways:

- **No automatic retries:** no retry plugin, runner option or CI retry step. A flake shows as a red run, and a re-run of the same commit confirms it.
- **Retries that only diagnose:** allowed only when the runner reports a pass on retry as its own outcome (for example, "flaky") **and** the run is configured to fail on that outcome. The retry then proves, within the run, that the failure and the pass came from the same commit, and keeps the evidence of each attempt.

What is forbidden is a retry the merge gate cannot see: the gate reads only pass or fail, so nobody opens a report to learn that a pass needed two attempts. The stack enforces its choice with a check that was seen failing, as every gate is (`.claude/rules/core.md`).

Not retries, and therefore fine:

- **A wait on a condition:** it polls for a state and does not repeat the action under test. A fixed wait (sleep) is not a condition.
- **Polling a read**, such as a query until a resource appears. Wrapping the **action under test** in a polling helper is a retry in disguise: it repeats the action until it works and hides why it did not.

## 4. Fix the cause and prove it

The issue closes with a root cause that was **observed**, not inferred, and one of two outcomes:

- **Fix.** The application, the test or its support code is corrected, and a test that pins the cause deterministically was seen failing. Repeating until the race shows up is not that test: force the condition instead (delay a response, order the events).
- **Delete or rewrite.** If other tests cover the behaviour, remove the test, or rewrite it at a lower level, closer to the code it checks. Name the test that covers it.

Repeated green runs are supporting evidence only, and the record must state their odds. With a failure rate `p`, `n` green runs happen by chance with probability `(1 - p)^n`:

| Failure rate | Green runs | Chance of all green with the bug still there |
| --- | --- | --- |
| 1 in 9 | 10 | 31% |
| 1 in 9 | 26 | under 5% |

## 5. Quarantine: the last resort

Quarantine protects the healthy tests' signal, but a quarantined test detects nothing, and it can hide a real race ([Fowler](https://martinfowler.com/articles/nonDeterminism.html)). A flake that fails rarely stays in the suite: its next failure is the data the investigation needs.

**Criteria, all required:**

- the issue exists and holds the evidence collected so far;
- the flake keeps blocking unrelated work, despite the investigation;
- the issue names the behaviour that loses coverage while the test is out.

**Limits** (*judgment call*; Fowler recommends a numeric or time limit, with 8 tests and one week as his examples): at most **3 tests** at once and **14 days** per test, with the issue at `priority: P1` and its deadline written in it. Reaching a limit makes clearing the quarantine the next mission.

**How:** tag the test `@quarantine` (or the runner's equivalent) and exclude the tag from the CI runs. Never use the expected-failure marker, which is reserved for known application defects ([KNOWN_ISSUES.md](KNOWN_ISSUES.md)), nor a skip, which leaves no trace in the issue. A quarantined test stops producing evidence, so the issue says how to run it on demand until the fix.

## Sources

- Martin Fowler, [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html): why flaky tests ruin a suite ("you end up shrugging your shoulders when these tests go red"), quarantine and its limits ("only allow 8 tests in quarantine", "no longer than a week").
