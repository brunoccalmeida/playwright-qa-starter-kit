#!/bin/sh
# SessionStart hook (matchers "startup" and "clear"): the first step of the
# mission cycle in .claude/rules/core.md, run by Claude Code instead of
# remembered. Plain stdout enters Claude's context (Hooks reference,
# SessionStart), capped at 10,000 characters, so it carries only the live
# lists and points at the session summary, which is larger than that.
#
# A failed gh call prints its error where the list would be, so Claude sees
# the cause instead of an empty list it would read as "nothing open". POSIX
# sh and gh only: the core names no stack, and on Windows Claude Code runs
# hooks through Git Bash.

list() {
  title=$1
  shift
  if output=$(gh "$@" 2>&1); then
    printf '%s:\n%s\n\n' "$title" "${output:-none}"
  else
    printf '%s: unavailable, `gh %s` failed:\n%s\n\n' "$title" "$*" "$output"
  fi
}

printf 'Mission start (core.md, "Mission cycle"): read the session-summary file named in the contracts table of CLAUDE.md, then propose the highest-priority mission from the lists below and confirm it with the user.\n\n'
list "Open issues" issue list --state open
list "Open pull requests" pr list --state open
