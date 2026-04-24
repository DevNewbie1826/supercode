# Work ID

`20260424-orch-exec-execute-prompt-pr-b62c`

## Objective

Validate and safely land the user-authored updates to the orchestrator prompt, executor prompt, related agent descriptions, and execute-skill guidance, while preserving the existing worktree edits and bringing them through the required Supercode gates.

## Current State

- The user has already made manual edits in the existing isolated worktree branch `20260424-orch-exec-prompt-worktree-e3f1`.
- The changed files currently visible in that worktree are:
  - `src/agents/definitions/orchestrator.agent.ts`
  - `src/agents/definitions/executor.agent.ts`
  - `src/agents/prompt-text/orchestrator-prompt.md`
  - `src/agents/prompt-text/executor-prompt.md`
  - `src/skills/execute/SKILL.md`
- The edits tighten orchestrator guidance around using the `question` tool for blocking user decisions and increase executor / execute-skill emphasis on AST-aware and LSP-aware tooling plus diagnostics checks.
- Fresh baseline evidence from the edited worktree shows `bun run typecheck` currently passes.
- The current edited worktree status shows modifications only in the five listed files.
- No formal workflow spec, plan, review artifacts, or PR have yet been produced for these already-made edits.

## Desired Outcome

- The current user-authored edits are brought under the staged Supercode workflow without discarding the existing worktree changes.
- A planning-ready spec, execution-ready plan, alignment package, execution review loop, and final review artifact exist for this work item.
- The changed prompt, agent-definition, and execute-skill files are verified, and only targeted fixes needed to make those same files pass review and verification are applied.
- After final-review PASS, the work is ready for the finish-stage option to push and create a PR if the user selects that option.

## Scope

In scope:

- Review and validate the existing edits in:
  - `src/agents/definitions/orchestrator.agent.ts`
  - `src/agents/definitions/executor.agent.ts`
  - `src/agents/prompt-text/orchestrator-prompt.md`
  - `src/agents/prompt-text/executor-prompt.md`
  - `src/skills/execute/SKILL.md`
- Reuse the existing worktree branch that contains the user-authored edits, provided it can be validated for continued workflow use.
- Create the required workflow artifacts for this work item under `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/`.
- Run repository checks needed to validate the changed prompt/skill surfaces and their immediate integration points.
- Make only the additional fixes needed inside the same five files, or directly coupled metadata/tests discovered by verification, when those fixes are required to satisfy review or verification.
- If verification reveals a required fix outside those files, stop and route back for scope confirmation instead of expanding silently.
- Proceed through finish so the user can explicitly choose the PR option after final-review PASS.

Out of scope:

- Expanding the work into unrelated prompt or skill rewrites outside the listed files.
- Changing workflow behavior in code paths unrelated to the prompt/skill guidance touched here.
- Publishing releases or modifying remote CI infrastructure.

## Non-Goals

- Do not redesign the entire workflow architecture.
- Do not broaden the request into all agent prompts or all skills.
- Do not create a PR before final-review PASS and explicit finish selection.

## Constraints

- Workflow must follow the full staged Supercode process: spec -> worktree -> plan -> pre-execute-alignment -> execute -> final-review -> finish.
- This run remains in `normal` mode, so user approval is required after spec review passes, and finish choice is required before PR creation.
- The orchestrator must not directly modify implementation code; any code or content changes required after review must be delegated through executor during execute.
- The work must preserve the user-authored edits already present in `.worktrees/20260424-orch-exec-prompt-worktree-e3f1/`.
- Worktree validation for this run must confirm all of the following before planning proceeds: the worktree path exists, the branch is `20260424-orch-exec-prompt-worktree-e3f1`, the changed-file set is limited to the five listed files unless additional files are explicitly explained, and the worktree remains usable for continued workflow execution.
- Verification for this work item must include `bun run typecheck`, plus at least one repository test command that exercises prompt/agent/skill loading or integration behavior if such a command exists and can be identified during planning.
- If no meaningful repository test beyond `bun run typecheck` exists for these surfaces, the plan must explicitly document that finding and use `bun run typecheck` as the verification floor.
- Reviewer contexts must remain artifact-focused and must not receive executor reasoning narratives.
- Finish may create a PR only after final-review PASS.

## Success Criteria

- `docs/supercode/20260424-orch-exec-execute-prompt-pr-b62c/spec.md`, `plan.md`, and `final-review.md` exist for this work item.
- The existing worktree containing the user-authored edits is either validated for reuse using the explicit checks in this spec, or a clear blocker is reported before planning proceeds.
- The final in-scope change set remains limited to the five listed files, unless an additional directly coupled file is explicitly justified by verification findings and recorded in the plan or review artifacts.
- The changed prompt, agent-definition, and execute-skill files pass execute-stage review and the concrete verification commands selected under this spec's verification constraint.
- `bun run typecheck` passes on the final branch state, and the result of the additional required verification command, or the explicit documented absence of such a command, is recorded.
- Final review returns PASS for this work item.
- If the user selects the PR finish option after final-review PASS, a PR is created from the finished branch.

## Risks / Unknowns

- Because the edits were made before this workflow run, worktree reuse may require extra validation to ensure the branch state is suitable for gated review and execution.
- Prompt and skill wording changes may require repository-specific tests or checks beyond `bun run typecheck`; the exact verification set needs to be confirmed during planning.
- Review may find policy conflicts between orchestrator instructions, execute-skill rules, and agent definitions that require targeted follow-up edits within the same files.

## Revisions

- Initial spec drafted from current worktree evidence and user request on 2026-04-24.
