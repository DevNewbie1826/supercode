---
name: finish
description: Use after final-review passes and tests are verified to choose and execute the final branch outcome: merge locally, create PR, keep branch open, or discard work.
---

## Purpose

The `finish` skill completes a development branch after the workflow has passed final review.

Its job is to:
- confirm final-review PASS
- verify tests before offering completion choices
- determine the base branch safely
- present exactly four finish options
- execute only the selected option
- clean up worktrees only when appropriate
- leave the repository in a known final state

Core principle:

```text
Verify tests -> Present options -> Execute choice -> Clean up only when appropriate
```

This skill is owned by the `orchestrator`.

---

## Primary Agent

- `orchestrator`

No subagent is required by default.

---

## Required Inputs

This skill requires:
- `work_id`
- approved spec path: `docs/supercode/<work_id>/spec.md`
- approved plan path: `docs/supercode/<work_id>/plan.md`
- final review path: `docs/supercode/<work_id>/final-review.md`
- final-review verdict: `PASS`
- active feature branch
- active worktree path
- repository test command, if known

---

## Hard Rules

1. Do not run this skill unless final-review verdict is `PASS`.
2. Verify tests before presenting finish options.
3. Do not proceed with failing tests.
4. Determine the base branch before presenting merge/PR options.
5. If base branch is ambiguous, ask one concise question.
6. Present exactly four options.
7. Do not add extra finish options.
8. Do not merge without explicit user selection.
9. Do not create a PR without explicit user selection.
10. Do not discard work without exact typed confirmation: `discard`.
11. Do not force-push unless explicitly requested.
12. Clean up worktree only for merge and discard options.
13. Preserve branch and worktree for PR and keep-as-is options.
14. Do not clear todo state before the selected option’s last required operational step completes.

---

## Workflow

### Step 1: Confirm Final Review

Before doing anything else, confirm:

- `docs/supercode/<work_id>/final-review.md` exists
- final-review verdict is `PASS`
- active branch and worktree are known

If final-review is missing or not PASS:
- stop
- do not present finish options
- route according to final-review failure category

---

### Step 2: Verify Tests

Before presenting options, verify the current branch still passes tests.

Use the project’s known verification command when available.

Examples:

```bash
npm test
cargo test
pytest
go test ./...
```

If tests fail:

```text
Tests failing (<N> failures). Must fix before completing:

[show failures]

Cannot proceed with merge or PR until tests pass.
```

Then stop.

Do not continue to option selection with failing tests.

If tests pass, continue.

---

### Step 3: Determine Base Branch

Try to detect the base branch automatically:

```bash
git merge-base HEAD main >/dev/null 2>&1 && echo main || \
git merge-base HEAD master >/dev/null 2>&1 && echo master
```

If detection is unclear, ask one concise question:

```text
This branch appears to have split from <candidate-base>. Is that correct?
```

Do not guess if the base branch is ambiguous.

---

### Step 4: Present Options

Present exactly these four options:

```text
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is
4. Discard this work

Which option?
```

Do not add extra explanation.
Do not add extra choices.

---

## Step 5: Execute Selected Choice

### Option 1: Merge Locally

Use when the user chooses to merge the feature branch into the base branch locally.

Process:

```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>
```

If merged-result tests pass:

```bash
git branch -d <feature-branch>
```

Then clean up the worktree.

If merged-result tests fail:
- report failures
- do not delete the feature branch
- do not claim completion
- stop for user direction or route back to debugging/execution as appropriate

---

### Option 2: Push and Create PR

Use when the user chooses to create a Pull Request.

Process:

```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- <2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

After PR creation:
- keep the branch
- keep the worktree
- report PR result or URL if available

Report:

```text
Pull Request created for <feature-branch>. Branch and worktree preserved for follow-up changes.
```

Do not clean up the worktree after PR creation unless explicitly requested.

---

### Option 3: Keep Branch As-Is

Use when the user wants to keep the completed branch and worktree without merging or creating a PR.

Report:

```text
Keeping branch <feature-branch>. Worktree preserved at <worktree-path>.
```

Do not clean up the worktree.
Do not delete the branch.

---

### Option 4: Discard This Work

Use when the user wants to delete the work.

Require exact confirmation first:

```text
This will permanently delete:
- Branch <feature-branch>
- All commits on this branch that are not merged
- Worktree at <worktree-path>

Type 'discard' to confirm.
```

Wait for exact confirmation:

```text
discard
```

If confirmed:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then clean up the worktree.

If the user does not type exactly `discard`:
- do not delete anything
- return to finish option selection

---

## Step 6: Cleanup Worktree

Clean up the worktree only for:

- Option 1: Merge locally
- Option 4: Discard this work

Check worktrees:

```bash
git worktree list
```

If the worktree exists:

```bash
git worktree remove <worktree-path>
```

For Option 2:
- keep branch
- keep worktree

For Option 3:
- keep branch
- keep worktree

---

## Terminal Completion Contract

Todo clearing must occur only after the selected option’s last required non-`todo-sync` action is complete and its result is captured.

| Finish option | Last required operational action | Terminal state reached when | Todo-clear point |
|---|---|---|---|
| 1. Merge locally | merged-result verification and required worktree cleanup | merge succeeded, post-merge tests passed, cleanup/reporting complete | after cleanup result is captured, before final response |
| 2. Create PR | `gh pr create` succeeds and PR result is captured | PR created and preservation report ready | after PR result is captured, before final response |
| 3. Keep branch as-is | preservation report is prepared | branch/worktree preservation is reported and no more workflow-owned tool calls remain | immediately before final response |
| 4. Discard this work | confirmation, branch deletion, and required worktree cleanup complete | discard confirmed, deletion/cleanup/reporting complete | after cleanup result is captured, before final response |

Never clear todo state before:
- `git pull`
- `git merge`
- merged-result verification
- `gh pr create`
- `git branch -D`
- `git worktree remove`
- any other last required operational step for the selected option

---

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|---|---:|---:|---:|---:|
| 1. Merge locally | yes | no | no | yes |
| 2. Create PR | no | yes | yes | no |
| 3. Keep as-is | no | no | yes | no |
| 4. Discard | no | no | no | yes, force |

---

## Summary Requirements

Before or while presenting options, summarize briefly:

- `work_id`
- feature branch
- base branch
- worktree path
- final-review verdict
- tests verified
- important caveats, if any

Keep this concise.
Do not dump full spec, plan, or final-review contents unless explicitly requested.

---

## Completion Gate

The `finish` skill is complete only when:
- final-review PASS has been confirmed
- current tests pass before options are presented
- base branch has been determined or confirmed
- the user selected one of the four allowed options
- the selected option was executed
- worktree cleanup was performed only when appropriate
- final branch/worktree state is known
- final state was reported to the user

---

## Failure Handling

If tests fail before options:
- stop
- report failures
- do not offer merge/PR/discard choices as completion

If base branch is ambiguous:
- ask one concise confirmation question
- do not guess

If PR creation fails:
- report the failure
- preserve branch and worktree
- do not mark workflow complete

If merge fails:
- report the failure
- do not delete the feature branch
- do not clean up the worktree unless explicitly instructed

If discard confirmation is not exact:
- do not delete anything

If worktree cleanup fails:
- report the failure
- do not claim cleanup succeeded

---

## Common Mistakes

Never:
- proceed with failing tests
- merge without verifying tests on the merged result
- delete work without exact typed confirmation
- force-push without explicit request
- clean up branch or worktree after PR creation unless explicitly requested
- ask open-ended “what next?” questions
- add extra finish options
- clear todo state before the selected option’s last operational step is complete

Always:
- verify tests before offering options
- present exactly four options
- require typed `discard` confirmation for Option 4
- clean up worktree only for Options 1 and 4
- preserve branch and worktree for Options 2 and 3
- report final repository/worktree state clearly
