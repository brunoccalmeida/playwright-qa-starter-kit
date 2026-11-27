---
name: new-project
description: Applies to the project's GitHub repository what the template's files cannot, the labels, the merge settings and the ruleset in .github/rulesets/protect-main.json, and reads them back. Run once after the generated project is first pushed, and again whenever the ruleset file changes. Only the user triggers it, because it changes the repository's settings on GitHub.
disable-model-invocation: true
---

The template renders `.github/rulesets/protect-main.json`, but a file in the repository changes nothing on GitHub: until this runs, the `main-branch` takes direct pushes and the `gate` is not required. Names in backticks such as `main-branch` and `gate` are **contracts**: the real value is in the contracts table of `CLAUDE.md`. A contract missing from the table: stop and ask, never guess.

1. **Confirm the target.** `gh repo view --json nameWithOwner,visibility,viewerPermission,defaultBranchRef`. Stop when:
   - there is no GitHub repository yet: push the project first;
   - `viewerPermission` is not `ADMIN`: the settings and the ruleset need admin;
   - `defaultBranchRef.name` is not the `main-branch`: the ruleset targets the default branch (`~DEFAULT_BRANCH`), so it would protect the wrong one.

   Show the user the repository and what will change, and wait for their yes: this changes GitHub, not a file.
2. **Apply.** From the project's root: `sh .github/scripts/apply-github-settings.sh`. It is safe to run again. A non-zero exit shows gh's error; diagnose it (core.md, "Diagnosing errors") and never apply the settings some other way to get around it.
3. **Read back.** Each read must show the value, not only a success code:
   - `gh label list --json name --jq '.[].name'`: `priority: P0`, `priority: P1`, `priority: P2`, `blocked` and `reviewer-miss` among them;
   - `gh api 'repos/{owner}/{repo}' --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge,allow_auto_merge,delete_branch_on_merge,squash_merge_commit_title,squash_merge_commit_message}'`: squash only, auto-merge on, `PR_TITLE` and `PR_BODY`;
   - `gh api 'repos/{owner}/{repo}/rules/branches/<main-branch>' --jq '.[] | .type + " " + (.parameters.required_status_checks // "" | tostring)'`: the rules active on the `main-branch`, `pull_request` among them and `required_status_checks` with the `gate` as its `context` and `integration_id` 15368 (the GitHub Actions app, `gh api apps/github-actions --jq .id`).
4. **Report** each value read back. The gate is required from now on, so the next pull request merges only with the `gate` green.

The rulesets are documented for GitHub Team and Enterprise ([About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)); on GitHub Free they were seen working on a public repository (#74 of the template). On a private repository on Free, a failed ruleset call in step 2 is the expected cause.
