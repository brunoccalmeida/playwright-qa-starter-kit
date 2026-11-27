# Core rules

This file comes from the project template and is identical in every project. Do not edit
it here. Project-specific rules go in the project's `CLAUDE.md`; an exception to a rule
below goes there too, naming the rule and the reason.

## Contracts

Commands differ between projects, so these rules and the `mission` plugin refer to each
one by a fixed role name. The project's `CLAUDE.md` has a contracts table mapping each
role to its real value: a command, a branch, a check or a path.

| Role | Meaning |
| --- | --- |
| `check` | Static checks: lint, types, formatting |
| `test` | The test suite |
| `smoke` | The fastest end-to-end proof that the project runs |
| `main-branch` | The branch pull requests merge into |
| `gate` | The single CI check the branch ruleset requires |
| `session-summary` | The file with the project state and the next mission |

## Every test was seen failing

A test that never failed proves nothing.

1. **Test first:** write the test, run it, and see it fail for the expected reason;
   implement the minimum to pass; refactor while green.
2. **Mutation:** if a test passes from the start, break what it protects on purpose, see it
   fail with a message that points at the problem, and undo.

Record in the commit how the failure was seen (command and error). Gates (lint, CI) follow
the same rule: prove with a probe that they reject what they should.

## Never change a test just to make it pass

A failing test means the code is wrong until shown otherwise; fix the code. Change a test
only when it contradicts the requirement, and say so in the commit. Never weaken an
assertion, copy the actual value into the expected one, skip or delete a test, raise a
timeout or add a retry to hide a failure, or special-case the code for test inputs. If a
test looks wrong or the task looks infeasible, stop and say so instead of working around it.

## Best practices

- Source before proposing: back every claim about how an external tool, library or standard
  works, or about current practice, with a source, official documentation for the version
  in use first. If none is in the repository or the conversation, have `mission:researcher`
  find one first. A proposal with no such claim needs no research. Separate sourced facts
  from your own judgment.
- When there is more than one way, recommend the established practice and name the
  principle behind it (YAGNI, fail fast, DRY...).
- Custom investigation or measurement only when the expected saving clearly exceeds its
  cost; label estimates and assumptions as such.
- No shortcuts for convenience; a deviation needs an explicit reason in the commit, the
  docs, or an ADR.
- A rule that contradicts current best practice is replaced, not worked around.

## Mission cycle (one mission per chat)

Each chat handles one mission (one issue); state lives in the repository, not in the
conversation. Handoff never waits for the user to ask; only the merge does.

- **Start:** read the `session-summary`; list open issues and pull requests; propose the
  highest-priority mission (blocker → security → visibility → tech debt) and confirm.
- **Close:** run `/mission:close-mission`; the mission record goes in the pull request body.

## Context and tokens

- Always-loaded rules stay under 200 lines per file and hold only what cannot be inferred
  from the repository. Rules for one part of the code go in path-scoped files; procedures
  for one kind of task go in skills.
- Write rules concrete enough to verify, in plain words, without IMPORTANT or MUST. A rule
  with no exceptions becomes a test, hook or deny rule.
- Filter output at the source (`grep`, `head`, `--jq`, failed-job logs only); read web
  documentation by section, never the whole page. Prefer a CLI over an MCP server when
  both exist.
- Use a subagent only for parallel independent work, verbose output (wide searches,
  documentation, logs), or an independent review; it does not give a better answer.
  Decisions and diagnosis stay in the main session.
- Keep model and effort fixed during a chat.

## Wait for the result before acting

Every read or decision after an action waits for the action's result, never an
intermediate state. Ask: "does this see the result, or a state that is still changing?"

- CI checks: right after a push, green checks still belong to the previous commit; query
  by the current head SHA. A missing check is pending.
- `mergeStateStatus` is `UNKNOWN` right after a merge into the `main-branch`: wait until it
  leaves `UNKNOWN`.
- "Not known yet" is not "yes": pending, `UNKNOWN` or an empty answer mean wait.
- Wait on a condition, never on a fixed time; when polling, the interval only sets the
  pace, the condition ends the loop.

## Diagnosing errors

Never guess a fix: observe (full message, log), put it in context, look for the same
pattern elsewhere, find the root cause, fix every affected place, and validate with no
regression. Report the observed error, root cause, analysis, proposed fix with its
reason, and prevention.

## Git and pull requests

- Conventional Commits; atomic commits.
- One open pull request at a time; finished work waits in a local commit.
- Before opening the pull request, `mission:reviewer` reviews the diff against the issue and
  `REVIEW.md`; fix valid findings and record dismissed ones with the reason.
- Only the user merges, with `/mission:ship-pr`; never `--admin`.
- Never commit credentials; `.env` stays out of Git.

## Engineering defaults

- Do only what the task asks: no features, refactors or "improvements" beyond it, no
  helpers or abstractions for one-time use, no configurability nobody asked for, and no
  comments or docstrings on code you didn't change (comment only logic that isn't
  self-evident). Why: every extra line must be reviewed and maintained, and an unrequested
  change hides inside the requested one in the diff.
- Handle errors only where they can occur: at system boundaries (user input, external
  APIs, files, network). There, fail with a message that names the cause; never swallow
  an error with an empty catch or a fallback that hides it. Why: a hidden failure
  surfaces later, far from its cause, while the tests stay green.
- Everything written to the repository is in English. Why: it is a public portfolio, and
  English is the industry standard for code and documentation.
