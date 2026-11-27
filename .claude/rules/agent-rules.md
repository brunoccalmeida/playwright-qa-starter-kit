---
paths:
  - "CLAUDE.md"
  - ".claude/rules/**"
  - ".claude/settings.json"
  - "docs/ai-workflow/**"
---

# Agent rules

- Always-loaded rules (`CLAUDE.md` and `core.md`) hold nothing that ages: no dates, counts, versions or project state. Those live in the `session-summary`.
- Do not repeat in a rule what a linter, a formatter or a test already enforces.
- A change that promises to save tokens is measured before and after, as described in [`docs/ai-workflow/AGENT_TOKEN_SPEND.md`](../../docs/ai-workflow/AGENT_TOKEN_SPEND.md).
- `core.md` and this file come from the template: change them in the template, not here, or `copier update` turns the edit into a conflict.
