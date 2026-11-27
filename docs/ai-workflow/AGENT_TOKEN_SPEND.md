# Agent token spend

Why the rules in [`.claude/rules/core.md`](../../.claude/rules/core.md) ("Context and tokens") are what they are, with sources. This file is read on demand; the rules themselves stay short.

## Mental model

Each turn sends the **whole** context to the model again: system prompt, project rules, history and every tool result. Prompt caching makes rereading what did not change cheaper, but does not remove it. So the cost grows with three things:

1. **Always-loaded context** (`CLAUDE.md`, the rules without `paths:` and their `@imports`): paid in every request of every chat.
2. **Conversation length**: everything that comes in (logs, files read, command output) is reread in every following turn.
3. **Extra requests**: subagents, compaction, scheduled tasks.

A long context also **worsens the answer**: a rule lost in a large file is followed less consistently. Saving and quality point the same way.

## Practices and why

| Practice | Why | Source |
| --- | --- | --- |
| Each always-loaded file under 200 lines, holding only what applies to every chat | "Longer files consume more context and reduce adherence"; each `CLAUDE.md`, rules file and import counts as a separate file | [memory][mem] |
| `@import` does not save context | "Imported files are expanded and loaded into context alongside the CLAUDE.md that references them" | [memory][mem] |
| A rule for one part of the code goes in `.claude/rules/` with `paths:` | "A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file"; rules without `paths:` load at launch | [memory][mem] |
| A rule holds only what the agent could not work out from the code; a rule with no exceptions becomes a test, hook or deny rule, not emphasis (IMPORTANT, capitals) | `CLAUDE.md` "only holds what Claude couldn't work out from the code itself"; "piling on emphasis mostly makes Claude over-apply the rule. If it's a rule that can't bend, turn it into a hook or a deny rule" | [best practices][bp] |
| One mission per chat; `/clear` between unrelated tasks | `/clear` costs nothing; old context is paid in every following message. `/compact` is itself a large request | [costs][costs] · [best practices][bp] |
| After two failed corrections: `/clear` and a better prompt | The third correction is added to a history with two wrong attempts that keep being reread | [best practices][bp] |
| Model and effort chosen at the start of the chat, never changed in the middle | Changing the model invalidates the whole cache: the next turn rereads everything at full price | [prompt caching][pc] |
| Filter output at the source: `grep`, `head`, `--jq`, failed-job logs only, files read by range | Output dumped into the context is reread in every turn for the rest of the chat | [costs][costs] |
| Web documentation by section: the list of headings, then only the section needed | A whole documentation page can be tens of thousands of characters, reread in every turn | [costs][costs] |
| A CLI before an MCP server | A CLI adds no tool listing to the context | [costs][costs] |
| A subagent only for parallel independent work, verbose output, or a reviewer that has not seen the code | Each subagent starts from zero (gathers again the context the conversation already had) and adds requests. Delegating does not make the answer better | [best practices][bp] · [costs][costs] |
| Specific requests (file, function, done criterion) | A vague request triggers a wide sweep of the code | [costs][costs] |

## How to measure

Decide with data, not by guess. A change that promises to save tokens is measured before and after, on comparable missions:

- **`/context`**: what takes up the context now (loaded rules, tools, history). Use it to check the real size of the rules.
- **`/usage`**: the session's tokens per model (input, output, cache reads and writes) and the share served from the cache.

Record the before and after, with the date and the mission, in the pull request of the change.

[mem]: https://code.claude.com/docs/en/memory
[costs]: https://code.claude.com/docs/en/costs
[bp]: https://code.claude.com/docs/en/best-practices
[pc]: https://code.claude.com/docs/en/prompt-caching
