#!/bin/sh
# Applies to the project's GitHub repository what files cannot (#74): the
# labels the mission cycle uses, the merge settings, and the ruleset in
# .github/rulesets/protect-main.json. Run it from the project's root; gh fills
# {owner}/{repo} from the clone's remote or GH_REPO (gh api manual). It is
# safe to run again: labels are created or updated (--force), and the ruleset
# is replaced (PUT) when one with its name exists, created (POST) otherwise.
#
# Needs admin access to the repository. Stops at the first failed call and
# shows gh's error, so a setting never stays unapplied in silence. POSIX sh
# and gh only: the core names no stack.

set -u

RULESET=.github/rulesets/protect-main.json

fail() {
  echo "apply-github-settings: $*" >&2
  exit 1
}

# step <what> <command...>: run the command, or stop naming what failed
step() {
  what=$1
  shift
  "$@" || fail "could not apply the $what: \`$*\` failed"
}

[ -f "$RULESET" ] || fail "$RULESET not found; run from the project's root"
# The ruleset's own name, the only "name" at the top level of the file
name=$(sed -n 's/^  "name": "\(.*\)",$/\1/p' "$RULESET")
[ -n "$name" ] || fail "no top-level \"name\" in $RULESET"

label() {
  step "label $1" gh label create "$1" --color "$2" --description "$3" --force
}
label "priority: P0" B60205 "Blocking: CI red or tests untrustworthy"
label "priority: P1" D93F0B "Security or visibility"
label "priority: P2" FBCA04 "Technical debt"
label "blocked" B60205 "Waiting on an external dependency"
label "reviewer-miss" B60205 "Fixes a defect mission:reviewer let through; links the mission that shipped it"

# squash_merge_commit_title is required with squash_merge_commit_message
# (REST, "Update a repository")
step "merge settings" gh api -X PATCH 'repos/{owner}/{repo}' --silent \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F allow_auto_merge=true -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY

# includes_parents=false: an organization ruleset with the same name is not
# this repository's to replace
ids=$(gh api 'repos/{owner}/{repo}/rulesets?includes_parents=false' --paginate \
  --jq ".[] | select(.name == \"$name\") | .id") || fail "could not list the rulesets"
case "$ids" in
"") step "ruleset \"$name\"" gh api -X POST 'repos/{owner}/{repo}/rulesets' --input "$RULESET" --silent ;;
*[!0-9]*) fail "more than one ruleset is named \"$name\" (ids: $(echo "$ids" | tr '\n' ' ')); delete the extra ones, then run again" ;;
*) step "ruleset \"$name\"" gh api -X PUT "repos/{owner}/{repo}/rulesets/$ids" --input "$RULESET" --silent ;;
esac

echo "Applied the labels, the merge settings and the ruleset \"$name\"."
