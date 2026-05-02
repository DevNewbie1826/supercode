# Work ID

20260502-agent-permission-prompts-f4a9

# Goal

Apply the approved built-in agent permission-policy changes in the isolated worktree. Task 1 `explorer` and Task 2 `librarian` updates are already implemented and verified but not committed. The current execution focus is the newly approved Task 3 bash-only alignment: remove explicit `bash: "deny"` from remaining built-in agent definitions where still present, excluding `explorer` and `librarian`, while preserving all non-bash permissions and leaving prompts unchanged.

# Source Spec

`/Volumes/storage/workspace/supercode/.worktrees/20260502-agent-permission-prompts-f4a9/docs/supercode/20260502-agent-permission-prompts-f4a9/spec.md`

# Architecture / Design Strategy

- Keep the current Task 3 bash-only change narrow and test-driven: first add targeted failing expectations in existing tests, then remove only explicit `bash: "deny"` entries from the remaining built-in agent definition files that still contain them.
- Treat completed Task 1 and Task 2 as prior uncommitted context. They already updated `explorer` and `librarian`; Task 3 must exclude those agents from implementation targets and only verify they remain intact.
- Do not change permission type modeling because evidence shows `src/agents/types.ts` already supports nested permission rules through `AgentPermissionRule = AgentPermissionValue | Record<string, AgentPermissionValue>`.
- Do not edit prompts.
- Do not change `external_directory`, `read`, `webfetch`, `doom_loop`, or any other non-bash permission for remaining agents in Task 3.
- Use existing targeted test files discovered by the orchestrator:
  - `src/__tests__/supercode-config.test.ts` was used by Task 1 to prove config normalization preserves `read` permission rules.
  - `src/__tests__/builtin-agents.test.ts` is the Task 3 target for proving remaining built-in agent default permission objects no longer contain `bash: "deny"` while preserving existing non-bash permissions.
  - `src/__tests__/config-handler-agent.test.ts` is the Task 3 target for proving `createConfigHandler` emits built-in agent permissions without `bash: "deny"` for remaining agents while preserving existing non-bash permissions.
- Use repository-level verification requested by the spec after implementation: `bun test` and `bun run typecheck`, plus artifact checks that only approved files changed and no prompts changed.

# Scope

Included:

- Task 1 completed context:
  - Added/updated tests in `src/__tests__/supercode-config.test.ts` proving nested `read` permission rules are preserved by config normalization.
  - Added/updated tests in `src/__tests__/builtin-agents.test.ts` proving `explorer` built-in default permissions match the approved policy.
  - Added/updated tests in `src/__tests__/config-handler-agent.test.ts` proving `createConfigHandler` emits the effective `config.agent.explorer.permission.read` object and related explorer permissions Supercode controls.
  - Added `read` to `ROOT_AGENT_PERMISSION_KEYS` in `src/supercode-config.ts`.
  - Updated only `src/agents/definitions/explorer.agent.ts` permissions:
    - remove `bash: "deny"`
    - keep `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `task` denied
    - add `external_directory: "allow"`
    - add `webfetch: "allow"`
    - add `doom_loop: "deny"`
    - add `read: { "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`
- Task 2 completed context:
  - Add/update tests in `src/__tests__/builtin-agents.test.ts` proving `librarian` built-in default permissions match the approved policy.
  - Add/update tests in `src/__tests__/config-handler-agent.test.ts` proving `createConfigHandler` emits the effective `config.agent.librarian.permission.read` object and related librarian permissions Supercode controls.
  - Update only `src/agents/definitions/librarian.agent.ts` permissions:
    - remove `bash: "deny"`
    - keep `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `task` denied
    - add `external_directory: "allow"`
    - add `webfetch: "allow"`
    - add `doom_loop: "deny"`
    - add `read: { "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`
  - Run targeted builtin/config-handler tests, full `bun test`, and `bun run typecheck` after the librarian change.
- Task 3 current scope:
  - Add/update tests in `src/__tests__/builtin-agents.test.ts` proving remaining built-in agent default permission objects no longer contain `bash: "deny"` after the bash-only alignment.
  - Add/update tests in `src/__tests__/config-handler-agent.test.ts` proving `createConfigHandler` emitted built-in agent permissions no longer include `bash: "deny"` for remaining agents after the bash-only alignment.
  - Remove only explicit `bash: "deny"` entries from remaining built-in agent definitions where still present, excluding `explorer` and `librarian`.
  - Likely Task 3 production targets identified by current worktree search are:
    - `src/agents/definitions/task-compliance-checker.agent.ts`
    - `src/agents/definitions/spec-reviewer.agent.ts`
    - `src/agents/definitions/final-reviewer.agent.ts`
    - `src/agents/definitions/code-quality-reviewer.agent.ts`
    - `src/agents/definitions/systematic-debugger.agent.ts`
    - `src/agents/definitions/plan-checker.agent.ts`
    - `src/agents/definitions/completion-verifier.agent.ts`
    - `src/agents/definitions/plan-challenger.agent.ts`
    - `src/agents/definitions/code-spec-reviewer.agent.ts`
  - Run targeted builtin/config-handler tests, full `bun test`, and `bun run typecheck` after the bash-only change.

Excluded:

- Prompt edits.
- Permission changes beyond completed Task 1 `explorer`, completed Task 2 `librarian`, and current Task 3 removal of explicit `bash: "deny"` entries from remaining built-in agents.
- Task 3 changes to `src/supercode-config.ts`; Task 1 already added the `read` root permission key and Task 3 does not involve config root keys.
- Task 3 changes to `external_directory`, `read`, `webfetch`, `doom_loop`, prompts, or any non-bash permission for remaining agents.
- Changes to `src/agents/types.ts`; evidence already shows nested permission records are supported, so modifying this file is out of scope unless the plan is revised first.
- Runtime permission forwarding or nested approval UI behavior changes.
- OpenCode runtime glob precedence or permission matching behavior. This work does not change how OpenCode interprets glob rules; Supercode's responsibility in this work is to emit explicit `read` rules to OpenCode.

# Evidence and Baseline

- Worktree readiness is already completed before implementation. The executor must not recreate the worktree.
- `.worktrees/` ignore safety has already been verified before implementation.
- Baseline dependency/setup verification has already been completed with `bun install` before implementation.
- Baseline `bun test` passed before implementation.
- Baseline `bun run typecheck` passed before implementation.
- Evidence from `src/agents/types.ts`: nested permission records are supported by `AgentPermissionRule = AgentPermissionValue | Record<string, AgentPermissionValue>`.
- Task 1 completion evidence: explorer permission update is already implemented and verified in the worktree but not committed.
- Task 1 completion evidence: `read` has already been added to `ROOT_AGENT_PERMISSION_KEYS` in `src/supercode-config.ts`, so later tasks should rely on existing read-root-key preservation.
- Task 2 completion evidence: librarian permission update is already implemented and verified in the worktree but not committed.
- Historical evidence before Task 1: `src/supercode-config.ts` lacked `read` in `ROOT_AGENT_PERMISSION_KEYS`, which is why Task 1 added it.
- Historical evidence before Task 1: `src/agents/definitions/explorer.agent.ts` denied `apply_patch`, `edit`, `bash`, `ast_grep_replace`, `lsp_rename`, and `task`.
- Task 2 current evidence from the expanded spec: `src/agents/definitions/librarian.agent.ts` currently denies `bash`, `edit`, `apply_patch`, `ast_grep_replace`, `lsp_rename`, and `task`; the approved change removes the explicit `bash` denial, keeps write/delegation denials, and adds `external_directory`, `webfetch`, `doom_loop`, and `.env` read rules.
- Task 3 current evidence from the expanded spec: remaining built-in agents still need bash-only alignment if their default permission objects contain explicit `bash: "deny"`; `external_directory`, `read`, `webfetch`, `doom_loop`, prompts, and all non-bash permissions are out of scope for those remaining agents.
- Task 3 current worktree search found explicit `bash: "deny"` in these remaining built-in agent definitions, excluding already-satisfied `explorer` and `librarian`: `task-compliance-checker.agent.ts`, `spec-reviewer.agent.ts`, `final-reviewer.agent.ts`, `code-quality-reviewer.agent.ts`, `systematic-debugger.agent.ts`, `plan-checker.agent.ts`, `completion-verifier.agent.ts`, `plan-challenger.agent.ts`, and `code-spec-reviewer.agent.ts`.

# Assumptions

- `read` root permission preservation is already available from Task 1 and should not be reimplemented in Task 3.
- Existing project commands `bun test` and `bun run typecheck` remain the required post-change verification commands for this worktree.
- Because baseline `bun test` and `bun run typecheck` passed before implementation, any post-change failure must be treated as introduced by this work unless there is direct evidence from a fresh unrelated environmental failure.
- Because Task 1 and Task 2 are uncommitted, Task 3 diff boundaries must be evaluated as an incremental delta from the current pre-Task-3 worktree state, not by assuming the full working-tree diff contains only Task 3 files.

# Source Spec Alignment

- Spec lines 38-40 define completed Task 1/Task 2 as prior context only.
- Spec lines 41-47 approve the current Task 3 bash-only alignment: remove explicit `bash: "deny"` from remaining built-in agent definitions, exclude `explorer` and `librarian`, and preserve all non-bash permissions.
- Spec lines 50-56 exclude broader permission, prompt, workflow, upstream runtime, and nested approval-forwarding changes.
- Spec lines 78-93 define success criteria: prior explorer/librarian changes remain intact, remaining built-in agents have no explicit `bash: "deny"`, non-bash permissions and prompt files remain unchanged, and tests/typecheck pass.
- This plan contains three tasks: Task 1 and Task 2 are completed prior context; Task 3 is the current implementation task for bash-only alignment.

# Execution Policy

- Work only inside `/Volumes/storage/workspace/supercode/.worktrees/20260502-agent-permission-prompts-f4a9`.
- Do not recreate the worktree or rerun setup as a readiness step; readiness is already completed and recorded under Evidence and Baseline.
- For Task 3, follow test-driven-development explicitly:
  1. Capture the pre-Task-3 worktree state or otherwise record the current diff so Task 3 incremental boundaries can be distinguished from already-uncommitted Task 1/Task 2 changes.
  2. Add/update targeted bash-only tests in `src/__tests__/builtin-agents.test.ts` and `src/__tests__/config-handler-agent.test.ts` before production edits.
  3. Run targeted failing tests for those files, or the narrowest supported test invocation, and record that they fail for the expected reason: remaining built-in agents still contain or emit explicit `bash: "deny"`.
  4. Make production edits only in remaining built-in agent definition files that still contain `bash: "deny"`, excluding `explorer.agent.ts` and `librarian.agent.ts`.
  5. Rerun targeted builtin/config-handler tests and then full `bun test` and `bun run typecheck`.
- Do not modify files outside the Task 3 approved target set without replanning: `src/__tests__/builtin-agents.test.ts`, `src/__tests__/config-handler-agent.test.ts`, and the remaining `src/agents/definitions/*.agent.ts` files listed under Task 3 production targets.
- Do not modify `src/supercode-config.ts` for Task 3.
- Do not modify `explorer.agent.ts` or `librarian.agent.ts` for Task 3 except to fix an accidental regression, and only if verification proves such a regression exists.
- Do not edit prompt files.
- Do not commit, merge, push, or create a PR as part of this plan.

# File Structure

Task 1 completed modified files:

- `src/__tests__/supercode-config.test.ts`
- `src/__tests__/builtin-agents.test.ts`
- `src/__tests__/config-handler-agent.test.ts`
- `src/supercode-config.ts`
- `src/agents/definitions/explorer.agent.ts`

Task 2 approved modified files:

- `src/__tests__/builtin-agents.test.ts`
- `src/__tests__/config-handler-agent.test.ts`
- `src/agents/definitions/librarian.agent.ts`

Task 3 approved modified files:

- `src/__tests__/builtin-agents.test.ts`
- `src/__tests__/config-handler-agent.test.ts`
- `src/agents/definitions/task-compliance-checker.agent.ts`
- `src/agents/definitions/spec-reviewer.agent.ts`
- `src/agents/definitions/final-reviewer.agent.ts`
- `src/agents/definitions/code-quality-reviewer.agent.ts`
- `src/agents/definitions/systematic-debugger.agent.ts`
- `src/agents/definitions/plan-checker.agent.ts`
- `src/agents/definitions/completion-verifier.agent.ts`
- `src/agents/definitions/plan-challenger.agent.ts`
- `src/agents/definitions/code-spec-reviewer.agent.ts`

Expected tested/verified areas:

- Repository test suite via `bun test`
- TypeScript/type validation via `bun run typecheck`

# File Responsibilities

- `src/__tests__/supercode-config.test.ts`: Existing test target for config normalization. Add/update a test proving nested `read` permission records are preserved instead of dropped.
- `src/__tests__/builtin-agents.test.ts`: Existing test target for built-in agent defaults. Task 1 covered `explorer`, Task 2 covered `librarian`, and Task 3 must add/update bash-only expectations for remaining built-in agents.
- `src/__tests__/config-handler-agent.test.ts`: Existing test target for config-handler agent output. Task 1 covered emitted explorer permissions, Task 2 covered emitted librarian permissions, and Task 3 must add/update emitted bash-only expectations for remaining built-in agents.
- `src/supercode-config.ts`: Defines the root permission keys accepted during Supercode config normalization. Task 1 already added `read`; Task 3 must not edit this file.
- `src/agents/definitions/explorer.agent.ts`: Defines the `explorer` agent configuration and its default permissions. This file receives the approved OMO-like non-writing permission adjustments and explicit `.env` read rules.
- `src/agents/definitions/librarian.agent.ts`: Defines the `librarian` agent configuration and its default permissions. Task 2 updates only its permission object to the approved OMO-like non-writing policy with explicit `.env` read rules.
- Task 3 remaining built-in agent definition files: Define built-in agent defaults that still contain explicit `bash: "deny"`. Task 3 removes only that single bash-deny entry from each listed file and preserves all other permissions exactly.

# Task Sections

## Task 1 — COMPLETED: Test and apply explorer permission policy plus read root-key preservation

- Task id: `T1`
- Task name: `Test and apply explorer permission policy plus read root-key preservation`
- Purpose: Completed prior task. Proved the approved explorer permission behavior with targeted existing tests, then implemented the narrow production changes so `explorer` can use non-writing research capabilities while write/delegation tools remain denied and sensitive `.env` reads are explicitly denied.
- Files to create / modify / test:
  - Modify/test: `src/__tests__/supercode-config.test.ts`
  - Modify/test: `src/__tests__/builtin-agents.test.ts`
  - Modify/test: `src/__tests__/config-handler-agent.test.ts`
  - Modify: `src/supercode-config.ts`
  - Modify: `src/agents/definitions/explorer.agent.ts`
  - Test/verify: targeted tests for the three test files, then repository via `bun test` and `bun run typecheck`
- Concrete steps:
  1. In `src/__tests__/supercode-config.test.ts`, add/update a targeted test that exercises Supercode config normalization with nested `read` permission rules and expects the normalized result to preserve exactly these read rules: `"*.env": "deny"`, `"*.env.*": "deny"`, and `"*.env.example": "allow"`.
  2. In `src/__tests__/builtin-agents.test.ts`, add/update a targeted test for `explorer` built-in default permissions that expects:
     - no `bash: "deny"` entry
     - `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `task` remain `"deny"`
     - `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"`
     - nested `read` rules exactly include `"*.env": "deny"`, `"*.env.*": "deny"`, and `"*.env.example": "allow"`
  3. In `src/__tests__/config-handler-agent.test.ts`, add/update a targeted test that runs `createConfigHandler` and asserts the emitted `config.agent.explorer.permission.read` object is exactly `{ "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`; the same test must also assert `bash` is absent from emitted `config.agent.explorer.permission` and `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, `task`, `external_directory`, `webfetch`, and `doom_loop` match the approved explorer permission values.
  4. Before production edits, run the narrowest supported test invocation for `src/__tests__/supercode-config.test.ts`, `src/__tests__/builtin-agents.test.ts`, and `src/__tests__/config-handler-agent.test.ts` and record the expected failures:
     - config normalization drops `read` rules because `ROOT_AGENT_PERMISSION_KEYS` lacks `read`
     - `explorer` permissions do not yet match the approved target state because `bash: "deny"` is still present and the new allow/deny/read entries are missing
     - `createConfigHandler` does not yet emit the approved effective `config.agent.explorer.permission.read` object and related explorer permission values
  5. In `src/supercode-config.ts`, add `read` to `ROOT_AGENT_PERMISSION_KEYS` without removing or renaming any existing root permission keys.
  6. In `src/agents/definitions/explorer.agent.ts`, edit only the `permissions` object for the `explorer` agent.
  7. Remove the existing `bash: "deny"` entry from `explorer` permissions.
  8. Preserve these denied entries unchanged in intent: `apply_patch: "deny"`, `edit: "deny"`, `ast_grep_replace: "deny"`, `lsp_rename: "deny"`, and `task: "deny"`.
  9. Add `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` to the `explorer` permissions.
  10. Add nested `read` rules to the `explorer` permissions exactly for the approved patterns: `"*.env": "deny"`, `"*.env.*": "deny"`, and `"*.env.example": "allow"`.
  11. Rerun the targeted tests for `src/__tests__/supercode-config.test.ts`, `src/__tests__/builtin-agents.test.ts`, and `src/__tests__/config-handler-agent.test.ts`; they must pass.
  12. Confirm no prompt files and no other agent definition files were modified.
  13. Run `bun test` from the worktree root.
  14. Run `bun run typecheck` from the worktree root.
- Explicit QA / verification:
  - Static diff check confirms edits are limited to exactly these approved files: `src/__tests__/supercode-config.test.ts`, `src/__tests__/builtin-agents.test.ts`, `src/__tests__/config-handler-agent.test.ts`, `src/supercode-config.ts`, and `src/agents/definitions/explorer.agent.ts`.
  - Static diff check confirms no prompt files changed.
  - Test evidence confirms the targeted tests were added/updated before production edits and failed for the expected reasons before the production changes.
  - Test evidence confirms the targeted tests pass after the production changes.
  - `src/__tests__/config-handler-agent.test.ts` specifically proves that running `createConfigHandler` emits `config.agent.explorer.permission.read` exactly as `{ "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`, with `bash` absent and the other approved explorer permissions present.
  - Static diff check confirms `bash: "deny"` is absent from `explorer` permissions.
  - Static diff check confirms `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `task` remain denied in `explorer` permissions.
  - Static diff check confirms `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` are present in `explorer` permissions.
  - Static diff check confirms nested `read` rules contain `"*.env": "deny"`, `"*.env.*": "deny"`, and `"*.env.example": "allow"`.
  - Static diff check confirms the nested `read` rule object orders the specific `"*.env.example": "allow"` entry after the broader deny entries if the object is order-sensitive in runtime matching.
  - Static diff check confirms `read` is included in `ROOT_AGENT_PERMISSION_KEYS`.
  - `bun test` exits successfully after the change.
  - `bun run typecheck` exits successfully after the change.
- Expected result: The worktree contains targeted regression coverage plus the approved narrow permission-policy update; nested `read` rules are preserved by config normalization; `createConfigHandler` emits the effective explorer permission config Supercode controls; `explorer` no longer explicitly denies `bash`; explicit `.env` read rules are emitted to OpenCode; prompts remain unchanged; tests and typecheck pass.
- Dependency notes: This task depends on completed worktree readiness/baseline evidence and the approved spec. No setup/worktree-creation task must precede it because readiness is already complete.
- Parallel eligibility: Not parallelizable. The test edits must precede production edits, and all five file changes share one cohesive permission-policy behavior and one verification boundary.

## Task 2 — COMPLETED: Test and apply librarian permission policy

- Task id: `T2`
- Task name: `Test and apply librarian permission policy`
- Purpose: Completed prior task. Proved the approved librarian permission behavior with targeted existing tests, then updated only the librarian production permission object so `librarian` follows the approved OMO-like non-writing policy while write/delegation tools remain denied and sensitive `.env` reads are explicitly denied.
- Files to create / modify / test:
  - Modify/test: `src/__tests__/builtin-agents.test.ts`
  - Modify/test: `src/__tests__/config-handler-agent.test.ts`
  - Modify: `src/agents/definitions/librarian.agent.ts`
  - Do not modify for Task 2: `src/supercode-config.ts` unless a targeted test failure proves the existing Task 1 `read` root-key preservation is insufficient; if so, stop and replan before editing it.
  - Test/verify: targeted tests for builtin/config-handler librarian coverage, then repository via `bun test` and `bun run typecheck`
- Concrete steps:
  1. In `src/__tests__/builtin-agents.test.ts`, add/update a targeted test for `librarian` built-in default permissions that expects:
     - no `bash: "deny"` entry
     - `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `task` remain `"deny"`
     - `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"`
     - nested `read` rules exactly equal `{ "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`
  2. In `src/__tests__/config-handler-agent.test.ts`, add/update a targeted test that runs `createConfigHandler` and asserts the emitted `config.agent.librarian.permission.read` object is exactly `{ "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`; the same test must also assert `bash` is absent from emitted `config.agent.librarian.permission` and `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, `task`, `external_directory`, `webfetch`, and `doom_loop` match the approved librarian permission values.
  3. Before the librarian production edit, run the narrowest supported targeted test invocation for `src/__tests__/builtin-agents.test.ts` and `src/__tests__/config-handler-agent.test.ts` and record the expected failures:
     - `librarian` built-in permissions do not yet match the approved target state because `bash: "deny"` is still present and the new allow/deny/read entries are missing.
     - `createConfigHandler` does not yet emit the approved effective `config.agent.librarian.permission.read` object and related librarian permission values.
  4. In `src/agents/definitions/librarian.agent.ts`, edit only the `permissions` object for the `librarian` agent.
  5. Remove the existing `bash: "deny"` entry from `librarian` permissions.
  6. Preserve these denied entries unchanged in intent: `apply_patch: "deny"`, `edit: "deny"`, `ast_grep_replace: "deny"`, `lsp_rename: "deny"`, and `task: "deny"`.
  7. Add `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` to the `librarian` permissions.
  8. Add nested `read` rules to the `librarian` permissions exactly for the approved patterns: `"*.env": "deny"`, `"*.env.*": "deny"`, and `"*.env.example": "allow"`.
  9. Rerun the targeted builtin/config-handler tests; they must pass for librarian coverage.
  10. Confirm no prompt files, no other agent definition files, and no `src/supercode-config.ts` changes were made for Task 2.
  11. Run `bun test` from the worktree root.
  12. Run `bun run typecheck` from the worktree root.
- Explicit QA / verification:
  - Static diff check for Task 2 confirms edits are limited to exactly these approved files: `src/__tests__/builtin-agents.test.ts`, `src/__tests__/config-handler-agent.test.ts`, and `src/agents/definitions/librarian.agent.ts`.
  - Static diff check confirms no prompt files changed.
  - Static diff check confirms `src/supercode-config.ts` was not modified by Task 2; if this is not true, execution must show a targeted test failure that required replanning before the file was changed.
  - Test evidence confirms librarian targeted tests were added/updated before the librarian production edit and failed for the expected reasons before the production change.
  - Test evidence confirms librarian targeted tests pass after the production change.
  - `src/__tests__/builtin-agents.test.ts` proves librarian built-in default permissions match the approved policy.
  - `src/__tests__/config-handler-agent.test.ts` proves running `createConfigHandler` emits `config.agent.librarian.permission.read` exactly as `{ "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`, with `bash` absent and the other approved librarian permissions present.
  - Static diff check confirms `bash: "deny"` is absent from `librarian` permissions.
  - Static diff check confirms `apply_patch`, `edit`, `ast_grep_replace`, `lsp_rename`, and `task` remain denied in `librarian` permissions.
  - Static diff check confirms `external_directory: "allow"`, `webfetch: "allow"`, and `doom_loop: "deny"` are present in `librarian` permissions.
  - Static diff check confirms nested librarian `read` rules equal `{ "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow" }`.
  - `bun test` exits successfully after the librarian change.
  - `bun run typecheck` exits successfully after the librarian change.
- Expected result: The worktree contains targeted librarian regression coverage plus the approved narrow librarian permission-policy update; `createConfigHandler` emits the effective librarian permission config Supercode controls; `librarian` no longer explicitly denies `bash`; explicit `.env` read rules are emitted to OpenCode; prompts remain unchanged; Task 1 read-root-key preservation remains in place; tests and typecheck pass.
- Dependency notes: Task 2 depends on Task 1 being implemented and verified, specifically the existing `read` root-key preservation in `src/supercode-config.ts`. No setup/worktree-creation task must precede Task 2 because readiness is already complete.
- Parallel eligibility: Not parallelizable with Task 1 because Task 1 is already complete and Task 2 depends on its `read` root-key preservation. Within Task 2, tests must be edited before production changes.

## Task 3 — CURRENT: Remove remaining explicit bash denies from built-in agents

- Task id: `T3`
- Task name: `Remove remaining explicit bash denies from built-in agents`
- Purpose: Align remaining built-in agents with the approved OMO-like bash policy by removing only explicit `bash: "deny"` entries, while preserving all non-bash permissions and keeping completed `explorer`/`librarian` changes intact.
- Files to create / modify / test:
  - Modify/test: `src/__tests__/builtin-agents.test.ts`
  - Modify/test: `src/__tests__/config-handler-agent.test.ts`
  - Modify production targets only if they still contain `bash: "deny"` at execution time:
    - `src/agents/definitions/task-compliance-checker.agent.ts`
    - `src/agents/definitions/spec-reviewer.agent.ts`
    - `src/agents/definitions/final-reviewer.agent.ts`
    - `src/agents/definitions/code-quality-reviewer.agent.ts`
    - `src/agents/definitions/systematic-debugger.agent.ts`
    - `src/agents/definitions/plan-checker.agent.ts`
    - `src/agents/definitions/completion-verifier.agent.ts`
    - `src/agents/definitions/plan-challenger.agent.ts`
    - `src/agents/definitions/code-spec-reviewer.agent.ts`
  - Do not modify for Task 3: `src/supercode-config.ts`, `src/agents/definitions/explorer.agent.ts`, `src/agents/definitions/librarian.agent.ts`, prompt files, or non-agent-definition production files.
  - Test/verify: targeted builtin/config-handler bash-only coverage, then repository via `bun test` and `bun run typecheck`.
- Concrete steps:
  1. Capture the pre-Task-3 working-tree diff or equivalent file-state evidence so Task 3 incremental edits can be distinguished from uncommitted Task 1/Task 2 changes.
  2. In `src/__tests__/builtin-agents.test.ts`, add/update a mandatory global test that iterates/checks all built-in agent default permission objects and asserts none contains explicit `bash: "deny"`. This test must cover every built-in agent, including completed `explorer` and `librarian`; do not replace it with a weaker hard-coded check of only the expected Task 3 production target list.
  3. In `src/__tests__/config-handler-agent.test.ts`, add/update a targeted test that runs `createConfigHandler` and asserts emitted built-in agent permissions do not include `bash: "deny"` for the remaining Task 3 target agents, while preserving representative existing non-bash permissions for those agents.
  4. Before production edits, run the narrowest supported targeted test invocation for `src/__tests__/builtin-agents.test.ts` and `src/__tests__/config-handler-agent.test.ts` and record the expected RED failure: remaining built-in agents still contain or emit explicit `bash: "deny"`.
  5. In each Task 3 production target file that still contains `bash: "deny"`, remove only the `bash: "deny"` entry from that agent's default permission object.
  6. Preserve all other permissions exactly: do not add or change `external_directory`, `read`, `webfetch`, `doom_loop`, write/edit/patch/rename/task/question/todowrite, or any other non-bash permission.
  7. Do not edit `explorer.agent.ts` or `librarian.agent.ts`; they already satisfy the bash-only requirement from Tasks 1 and 2.
  8. Rerun the targeted builtin/config-handler tests; they must pass for bash-only coverage.
  9. Confirm the Task 3 incremental diff only removes `bash: "deny"` from the approved remaining agent definition files and only updates the two approved test files.
  10. Confirm no prompt files changed.
  11. Run `bun test` from the worktree root.
  12. Run `bun run typecheck` from the worktree root.
- Explicit QA / verification:
  - Pre-Task-3 snapshot/diff evidence exists so reviewers can separate Task 3 changes from uncommitted Task 1/Task 2 changes.
  - Task 3 static diff check confirms production edits are limited to removing `bash: "deny"` entries from the approved remaining built-in agent definition files.
  - Task 3 static diff check confirms no changes to `src/supercode-config.ts`.
  - Task 3 static diff check confirms no changes to `src/agents/definitions/explorer.agent.ts` or `src/agents/definitions/librarian.agent.ts`, unless an accidental regression is proven and corrected with evidence.
  - Task 3 static diff check confirms no `external_directory`, `read`, `webfetch`, `doom_loop`, prompt text, or other non-bash permission changes for remaining agents.
  - Test evidence confirms targeted bash-only tests were added/updated before production edits and failed for the expected pre-change reason.
  - Test evidence confirms targeted bash-only tests pass after production edits.
  - `src/__tests__/builtin-agents.test.ts` proves global success by iterating/checking all built-in agent default permission objects and asserting none contains explicit `bash: "deny"`; a hard-coded check of only the expected Task 3 target files is insufficient.
  - `src/__tests__/config-handler-agent.test.ts` proves `createConfigHandler` emitted built-in agent permissions no longer contain `bash: "deny"` for remaining agents while preserving existing non-bash permissions.
  - Prompt diff check confirms no prompt files changed.
  - `bun test` exits successfully after the bash-only change.
  - `bun run typecheck` exits successfully after the bash-only change.
- Expected result: Remaining built-in agents no longer explicitly deny bash; completed `explorer` and `librarian` permission updates remain intact; no non-bash permissions are changed for remaining agents; `src/supercode-config.ts` is unchanged by Task 3; prompt files remain unchanged; targeted tests, full tests, and typecheck pass.
- Dependency notes: Task 3 depends on Task 1 and Task 2 already being implemented and verified. Task 3 must start from the current uncommitted worktree state and evaluate its diff incrementally.
- Parallel eligibility: Not parallelizable with Task 1 or Task 2 because both are already complete and uncommitted. Within Task 3, test edits must precede production edits.

# QA Standard

Execution is acceptable only when all of the following are true:

- The executor does not recreate the worktree or redo setup as a readiness step; baseline evidence is already recorded in this plan.
- Task 3 records pre-Task-3 diff/state evidence so incremental Task 3 changes can be reviewed separately from uncommitted Task 1 and Task 2 changes.
- Task 3 test edits stay within exactly these files: `src/__tests__/builtin-agents.test.ts` and `src/__tests__/config-handler-agent.test.ts`.
- Task 3 production edits stay within the approved remaining built-in agent definition files listed in Task 3 and consist only of removing explicit `bash: "deny"` entries.
- Task 3 does not modify `src/supercode-config.ts`.
- Task 3 does not modify `src/agents/definitions/explorer.agent.ts` or `src/agents/definitions/librarian.agent.ts` except to correct a proven accidental regression.
- Prompt files remain unchanged.
- No agent permissions are changed except completed Task 1 `explorer`, completed Task 2 `librarian`, and current Task 3 bash-only removals from remaining built-in agents.
- Task 3 does not add or change `external_directory`, `read`, `webfetch`, `doom_loop`, prompt text, or any non-bash permission for remaining agents.
- Task 3 targeted tests are added/updated before production edits and fail for the expected pre-change reason that remaining agents still contain or emit `bash: "deny"`.
- Task 3 targeted tests pass after production edits.
- Builtin-agent test coverage globally checks all built-in agent default permission objects for absence of explicit `bash: "deny"`; target-list-only coverage is not acceptable.
- `createConfigHandler` test coverage proves emitted remaining built-in agent permissions no longer include `bash: "deny"` while preserving existing non-bash permissions.
- Completed explorer and librarian permission tests remain passing and those permissions remain intact.
- Task 1 `read` root-key preservation remains in place and is not modified by Task 3.
- OpenCode runtime glob precedence/matching remains out of scope; this plan verifies only that Supercode emits explicit read rules to OpenCode.
- Full `bun test` and `bun run typecheck` are run from the worktree root after the Task 3 bash-only implementation and pass.
- Any verification failure is treated as introduced by this work because baseline verification passed before implementation, unless direct evidence shows an unrelated environmental failure; do not fix outside scope without workflow routing.

# Revisions

- 2026-05-02: Initial execution-ready plan created from approved spec and provided evidence.
- 2026-05-02: Tightened verification expectations for baseline failures, implementation diff boundaries, and nested read-rule evidence after challenger review.
- 2026-05-02: Revised after plan-checker/challenger feedback to record completed worktree readiness baseline, make TDD targets explicit, restrict editable files to two tests plus two production files, and require failing-before/passing-after targeted behavior tests.
- 2026-05-02: Revised after challenger feedback to add `config-handler-agent` test coverage proving `createConfigHandler` emits the effective explorer permission config Supercode controls, while documenting OpenCode runtime glob matching as out of scope.
- 2026-05-02: Revised for newly approved `librarian` permission update. Task 1 is recorded as completed prior context; Task 2 was added as the librarian-only TDD task with approved file targets limited to builtin/config-handler tests and `librarian.agent.ts`.
- 2026-05-02: Revised for newly approved bash-only alignment. Task 1 and Task 2 are recorded as completed prior context; Task 3 is the current TDD task to remove only explicit `bash: "deny"` from remaining built-in agents while preserving all non-bash permissions and prompt files.
- 2026-05-02: Tightened Task 3 verification so builtin-agent tests must globally check every built-in agent default permission object for absence of explicit `bash: "deny"`, not only the expected production target list.
