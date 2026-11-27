# AI workflow

How the AI coding agent works on this repository.

| File | What it is |
| --- | --- |
| [PROJECT_SESSION_SUMMARY.md](../PROJECT_SESSION_SUMMARY.md) | Handoff between chats: current state and the next mission. One chat works on one mission; the agent reads this first and updates it in the mission's own pull request |
| [AGENT_TOKEN_SPEND.md](AGENT_TOKEN_SPEND.md) | Why the always-loaded rules stay short, with sources, and how to measure a change that promises to save context |

The rules live in the repository:

- [CLAUDE.md](../../CLAUDE.md): this project's contracts and rules, loaded in every chat;
- [.claude/rules/core.md](../../.claude/rules/core.md): the rules every project shares, loaded in every chat; it comes from the template and is not edited here;
- [.claude/rules/](../../.claude/rules/): the other files load only when the agent works on the paths in their `paths:` frontmatter.

Document templates: [ADR](../adr/template.md), [spike report](../spikes/template.md). Policies: [flaky tests](../FLAKY_TESTS.md), [known issues](../KNOWN_ISSUES.md).
