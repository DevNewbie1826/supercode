# Work ID

`20260424-orch-exec-prompt-worktree-e3f1`

## Objective

Prepare an isolated git worktree for user-owned prompt edits affecting the orchestrator and executor agents.

## Current State

- Agent prompt sources live under `src/agents/prompt-text/`, including `orchestrator-prompt.md` and `executor-prompt.md`.
- Agent definitions under `src/agents/definitions/*.agent.ts` load prompt markdown files by relative path.
- Workflow artifacts are stored under `docs/supercode/<work_id>/`.
- Isolated git worktrees are stored under `.worktrees/<work_id>/`.
- The user wants only the worktree prepared and intends to edit the prompts manually afterward.

## Desired Outcome

- A reviewed, approved workflow spec exists for this bounded request.
- An isolated worktree exists at `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/`, created from the repository state after the approved spec commit on `main`.
- The worktree is ready for manual edits to orchestrator and executor prompt-related files, meaning: the checkout succeeds, the worktree has a clean baseline status immediately after creation, and the expected prompt files are present at their normal repository paths.
- No prompt content changes are made as part of this workflow run.

## Scope

In scope:

- Define the bounded workflow request for creating a worktree dedicated to orchestrator and executor prompt updates.
- Create the isolated worktree after spec approval and commit, using the current `main` branch lineage unless the repository state changes before creation.
- Verify the worktree target location and baseline readiness needed for manual prompt editing.
- Verify that `src/agents/prompt-text/orchestrator-prompt.md` and `src/agents/prompt-text/executor-prompt.md` both exist inside the created worktree.

Out of scope:

- Editing `src/agents/prompt-text/orchestrator-prompt.md`.
- Editing `src/agents/prompt-text/executor-prompt.md`.
- Editing any skill instructions under `src/skills/`.
- Planning, executing, reviewing, or validating prompt-content changes.

## Non-Goals

- Do not modify production code or prompt text in this workflow run.
- Do not create an implementation plan for prompt wording changes.
- Do not run execute or final-review stages for prompt edits.

## Constraints

- Workflow must follow the staged Supercode process through spec approval and worktree creation.
- This run is in `normal` mode, so user approval is required after spec review passes.
- The orchestrator must not directly edit implementation code.
- Worktree location must use `.worktrees/<work_id>/`.
- Workflow artifacts must use `docs/supercode/<work_id>/`.
- The worktree must be created from the repository state on the current `main` branch after the spec commit for this work item.
- The worktree branch should use the same `work_id` as its branch name unless repository constraints require a documented fallback.
- Because prompt files are loaded by relative path from agent definition files, the worktree should preserve normal repository structure without renaming those files.
- Worktree readiness for this request means all of the following are true immediately after creation: (1) the worktree directory exists, (2) the worktree checkout is on the expected worktree branch derived from this work item, (3) `git status --short` is empty in the new worktree before user edits begin, and (4) both targeted prompt files exist at their expected repository paths.

## Success Criteria

- `docs/supercode/20260424-orch-exec-prompt-worktree-e3f1/spec.md` exists and is review-passing.
- The user approves the reviewed spec.
- The approved spec is committed.
- `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/` exists.
- The worktree is created from the repository state on `main` after the spec commit for this work item.
- The new worktree branch name matches `20260424-orch-exec-prompt-worktree-e3f1`, or any fallback branch name is explicitly reported.
- `git status --short` is empty in the new worktree before user edits begin.
- `src/agents/prompt-text/orchestrator-prompt.md` and `src/agents/prompt-text/executor-prompt.md` both exist in the new worktree.

## Risks / Unknowns

- The user may later decide prompt updates also require skill changes, which would be out of scope for this work item.
- If worktree creation from the post-spec-commit `main` state fails or yields a non-clean baseline, the request may need a degraded-readiness decision or remediation before handoff.
- Manual edits after worktree creation could still require separate planning/execution workflow if the user later asks for orchestrated implementation help.

## Revisions

- Initial spec drafted from user clarification and repository evidence on 2026-04-24.
- Revised after spec review to define readiness checks, source branch expectation, and concrete worktree success criteria.
